import { ethers } from "ethers";
import AppError from "../utils/AppError.js";
import prisma from "../config/prisma.js";
import contractService from "./contractService.js";
import oracleService from "./oracleService.js";

const APPROVE_THRESHOLD = 85;

async function submit({ campaignId, index, evidenceCID, metadataHash, title }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw AppError.notFound();

  const hash =
    metadataHash ||
    ethers.keccak256(ethers.toUtf8Bytes(evidenceCID || "evidence"));

  const onchain = await contractService.submitMilestone({
    campaignIdStr: campaign.onChainId,
    evidenceCID: evidenceCID || "QmEvidence",
    metadataHash: hash,
  });

  const milestone = await prisma.milestone.update({
    where: { campaignId_index: { campaignId, index } },
    data: {
      evidenceCID,
      metadataHash: hash,
      title: title || undefined,
      status: "SUBMITTED",
      txHashSubmit: onchain.txHash,
    },
  });

  return { ...milestone, txHash: onchain.txHash };
}

async function submitScore({ campaignId, index, score, nonce }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw AppError.notFound();

  const onchain = await oracleService.submitScore(
    campaign.onChainId,
    score,
    nonce,
  );

  const status = score >= APPROVE_THRESHOLD ? "APPROVED" : "REJECTED";
  const milestone = await prisma.milestone.update({
    where: { campaignId_index: { campaignId, index } },
    data: { aiScore: score, status, txHashOracle: onchain.txHash },
  });

  return { ...milestone, txHash: onchain.txHash, decision: status };
}

async function releaseAdvance(campaignId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw AppError.notFound();

  const onchain = await contractService.releaseAdvance(campaign.onChainId);
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "ADVANCE_PAID" },
  });
  return { txHash: onchain.txHash };
}

async function release({ campaignId, index }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw AppError.notFound();

  const onchain = await contractService.releaseMilestone(campaign.onChainId);
  const milestone = await prisma.milestone.update({
    where: { campaignId_index: { campaignId, index } },
    data: { status: "RELEASED", txHashRelease: onchain.txHash },
  });
  return { ...milestone, txHash: onchain.txHash };
}

export default { submit, submitScore, releaseAdvance, release };
