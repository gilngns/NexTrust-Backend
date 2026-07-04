import { ethers } from "ethers";
import AppError from "../utils/AppError.js";
import prisma from "../config/prisma.js";
import contractService from "./contractService.js";
import oracleService from "./oracleService.js";
import { calculateDistance } from "../utils/haversine.js";

// Ambang selaras dengan kontrak (oracleCallback):
//   score >= 85          -> VALIDATED  (lolos otomatis)
//   50 <= score <= 84    -> FROZEN     (abu-abu, wajib review Dinsos)
//   score < 50           -> FROZEN + refund enabled (gagal)
const APPROVE_THRESHOLD = 85;
const REVIEW_THRESHOLD = 50;

// Toleransi lokasi (md §8.1): radius wajar ~200 m.
const MAX_DISTANCE_METERS = 200;

// Memetakan skor AI ke status milestone di DB agar konsisten dengan
// keputusan on-chain. Kasus abu-abu TIDAK ditolak mentah, melainkan
// naik ke Dinsos (status EVALUATING) — prinsip "AI menilai, Dinsos memutuskan".
function scoreToStatus(score) {
  if (score >= APPROVE_THRESHOLD) return "APPROVED";
  if (score >= REVIEW_THRESHOLD) return "EVALUATING"; // abu-abu -> review Dinsos
  return "REJECTED"; // gagal -> refund
}

// Batas percobaan submit ulang sebelum eskalasi wajib ke Dinsos (md §8.2).
const MAX_SUBMIT_ATTEMPTS = 3;

async function submit({ campaignId, index, evidenceCID, metadataHash, title, latitude, longitude }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw AppError.notFound();

  const existing = await prisma.milestone.findUnique({
    where: { campaignId_index: { campaignId, index } },
  });

  const attempts = (existing?.submitAttempts || 0) + 1;

  let status = "SUBMITTED";

  // Toleransi lokasi (md §8.1): di luar radius wajar -> flag review, bukan tolak.
  if (campaign.latitude && campaign.longitude && latitude && longitude) {
    const distance = calculateDistance(campaign.latitude, campaign.longitude, latitude, longitude);
    if (distance > MAX_DISTANCE_METERS) {
      status = "EVALUATING"; // GPS terlalu jauh -> naik review Dinsos
    }
  }

  // Fallback §8.2: bila sudah mencapai batas percobaan, submit tetap diterima
  // tapi WAJIB review Dinsos (bukan celah pintas, bukan reject mentah).
  if (attempts >= MAX_SUBMIT_ATTEMPTS) {
    status = "EVALUATING";
  }

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
      latitude,
      longitude,
      status,
      submitAttempts: attempts,
      txHashSubmit: onchain.txHash,
    },
  });

  return {
    ...milestone,
    txHash: onchain.txHash,
    attempts,
    escalated: attempts >= MAX_SUBMIT_ATTEMPTS,
  };
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

  const status = scoreToStatus(score);
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
