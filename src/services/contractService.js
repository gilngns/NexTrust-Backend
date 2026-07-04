import { ethers } from "ethers";
import config from "../config/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const escrowAbi = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../abi/TrustFundEscrow.json"),
    "utf8",
  ),
);

const provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);
const backendWallet = new ethers.Wallet(
  config.chain.backendPrivateKey,
  provider,
);
const escrow = new ethers.Contract(
  config.chain.escrowAddress,
  escrowAbi,
  backendWallet,
);

async function toCampaignId(str) {
  return ethers.id(str);
}

async function status() {
  const [network, blockNumber, balance] = await Promise.all([
    provider.getNetwork(),
    provider.getBlockNumber(),
    provider.getBalance(backendWallet.address),
  ]);
  return {
    chainId: Number(network.chainId),
    blockNumber,
    backendAddress: backendWallet.address,
    backendBalancePOL: ethers.formatEther(balance),
    escrowAddress: config.chain.escrowAddress,
  };
}

async function getCampaignState(campaignIdStr) {
  return await escrow.getCampaignState(await toCampaignId(campaignIdStr));
}

async function getLockedFunds(campaignIdStr) {
  const locked = await escrow.getLockedFunds(await toCampaignId(campaignIdStr));
  return locked.toString();
}

async function getCampaign(campaignIdStr) {
  const c = await escrow.getCampaign(await toCampaignId(campaignIdStr));

  // Catatan: struct Campaign on-chain TIDAK menyimpan milestoneAmount tunggal.
  // Nominal per-milestone disimpan di mapping milestoneAmounts[campaignId][i]
  // (per-index), dan di DB tercermin pada Milestone.amount. Jangan baca
  // c.milestoneAmount di sini — field itu tidak ada di struct.
  return {
    campaignId: c.campaignId,
    targetAmount: c.targetAmount.toString(),
    totalCollected: c.totalCollected.toString(),
    advanceAmount: c.advanceAmount.toString(),
    totalMilestones: Number(c.totalMilestones),
    currentMilestone: Number(c.currentMilestone),
    state: Number(c.state),
    advanceReleased: c.advanceReleased,
    beneficiary: c.beneficiary,
  };
}

// Kontrak createCampaign menerima ARRAY porsi per-milestone (uint128[]),
// bukan satu nilai tunggal. Porsi harus mengikuti retensi progresif (md §3.2).
const createCampaign = async ({
  campaignIdStr,
  targetAmount,
  advanceAmount,
  milestoneAmounts, // bigint[]
  rabCID,
  beneficiary,
}) => {
  const id = await toCampaignId(campaignIdStr);
  const tx = await escrow.createCampaign(
    id,
    targetAmount,
    advanceAmount,
    milestoneAmounts,
    rabCID,
    beneficiary,
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, campaignId: id };
};

async function depositXIDR({ campaignIdStr, amount, donorAddress }) {
  const id = await toCampaignId(campaignIdStr);
  const tx = await escrow.depositXIDR(id, amount, donorAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

async function releaseAdvance(campaignIdStr) {
  const tx = await escrow.releaseAdvance(await toCampaignId(campaignIdStr));
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

async function submitMilestone({ campaignIdStr, evidenceCID, metadataHash }) {
  const id = await toCampaignId(campaignIdStr);
  const tx = await escrow.submitMilestone(id, evidenceCID, metadataHash);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

async function releaseMilestone(campaignIdStr) {
  const tx = await escrow.releaseMilestone(await toCampaignId(campaignIdStr));
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

async function resolveFrozen({ campaignIdStr, approve }) {
  const id = await toCampaignId(campaignIdStr);
  const tx = await escrow.resolveFrozen(id, approve);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

async function claimRefund({ campaignIdStr, donorSigner }) {
  const id = await toCampaignId(campaignIdStr);
  const tx = await escrow.claimRefund(id);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export default {
  status,
  getCampaignState,
  getLockedFunds,
  getCampaign,
  createCampaign,
  depositXIDR,
  releaseAdvance,
  submitMilestone,
  releaseMilestone,
  resolveFrozen,
  claimRefund,
};
