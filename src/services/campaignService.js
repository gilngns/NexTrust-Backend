import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";
import contractService from "./contractService.js";
import oracleService from "./oracleService.js";
import { progressiveRetentionSplit } from "../utils/milestoneSplit.js";
import { ethers } from "ethers";

async function _serialize(campaign) {
  const out = { ...campaign };
  for (const k of ["targetAmount", "advanceAmount", "milestoneAmount"]) {
    if (out[k] !== undefined && out[k] !== null) {
      out[k] = ethers.formatUnits(out[k], 6).split('.')[0];
    }
  }
  
  if (out.txHashCreate) {
    out.explorerUrl = `https://amoy.polygonscan.com/tx/${out.txHashCreate}`;
  }

  if (out.donations) {
    out.donations = out.donations.map((d) => ({
      ...d,
      amount: ethers.formatUnits(d.amount, 6).split('.')[0],
      explorerUrl: d.txHashDeposit ? `https://amoy.polygonscan.com/tx/${d.txHashDeposit}` : null,
    }));
  }
  if (out.milestones) {
    out.milestones = out.milestones.map((m) => ({
      ...m,
      amount: m.amount !== undefined && m.amount !== null ? ethers.formatUnits(m.amount, 6).split('.')[0] : null,
      evidenceUrl: m.evidenceCID ? `https://gateway.pinata.cloud/ipfs/${m.evidenceCID}` : null,
      explorerUrl: m.txHashRelease ? `https://amoy.polygonscan.com/tx/${m.txHashRelease}` 
                 : (m.txHashSubmit ? `https://amoy.polygonscan.com/tx/${m.txHashSubmit}` : null),
    }));
  }
  return out;
}

const create = async (payload) => {
  const {
    onChainId,
    title,
    description,
    imageUrl,
    category,
    rabCID,
    targetAmount,
    advanceAmount,
    milestoneAmount,
    totalMilestones,
    foundationId,
    latitude,
    longitude,
    izinPub,
    aiScore,
    aiNotes,
    rabData,
  } = payload;

  const foundation = await prisma.user.findUnique({
    where: { id: foundationId },
  });
  if (!foundation) throw AppError.notFound();
  if (!foundation.custodialAddress) {
    throw AppError.badRequest();
  }
  const beneficiary = foundation.custodialAddress;

  const tAmt = targetAmount || 0;
  const aAmt = advanceAmount || 0;

  const targetToken = ethers.parseUnits(tAmt.toString(), 6);
  const advanceToken = ethers.parseUnits(aAmt.toString(), 6);
  const milestoneTotal = targetToken - advanceToken;
  const milestoneAmounts = progressiveRetentionSplit(
    milestoneTotal,
    totalMilestones,
  );

  const onchain = await contractService.createCampaign({
    campaignIdStr: onChainId,
    targetAmount: targetToken,
    advanceAmount: advanceToken,
    milestoneAmounts,
    rabCID: rabCID || "QmPlaceholder",
    beneficiary,
  });

  const campaign = await prisma.campaign.create({
    data: {
      onChainId,
      title,
      description,
      imageUrl,
      category,
      rabCID,
      targetAmount: targetToken,
      advanceAmount: advanceToken,
      milestoneAmount: milestoneTotal,
      totalMilestones,
      foundationId,
      beneficiary,
      latitude,
      longitude,
      izinPub,
      aiScore,
      aiNotes,
      rabData,
      status: (aiScore !== undefined && aiScore < 85) ? "EVALUATING" : "ACTIVE",
      txHashCreate: onchain.txHash,
      milestones: {
        create: Array.from({ length: totalMilestones }, (_, i) => ({
          index: i,
          title: `Milestone ${i + 1}`,
          amount: milestoneAmounts[i], 
        })),
      },
    },
    include: { milestones: true },
  });

  if (aiScore !== undefined && aiScore >= 85) {
    try {
      await oracleService.submitScore(onChainId, aiScore, Date.now());
    } catch (error) {
      console.error("[campaignService] Gagal submitScore ke blockchain saat create:", error);
    }
  }

  return await _serialize(campaign);
};

async function list(status) {
  const campaigns = await prisma.campaign.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { 
      foundation: { select: { name: true } },
      milestones: true,
      donations: {
        select: { status: true, amount: true }
      }
    },
  });
  return await Promise.all(campaigns.map(async (c) => {
    const serialized = await _serialize(c);
    
    const successfulDonations = c.donations
      ? c.donations.filter(d => ["PAID", "DEPOSITED"].includes(d.status))
      : [];
      
    const collected = successfulDonations.reduce((sum, d) => sum + BigInt(d.amount), 0n);
    
    serialized.collectedAmount = ethers.formatUnits(collected, 6).split('.')[0];
    serialized.donorCount = successfulDonations.length;
    
    // Remove donations from list response to keep it lightweight
    delete serialized.donations;

    return serialized;
  }));
}

async function getById(id) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { index: "asc" } },
      donations: { orderBy: { createdAt: "desc" } },
      foundation: {
        select: { name: true, bankName: true, bankAccountNo: true },
      },
    },
  });
  if (!campaign) throw AppError.notFound();

  let onChainState = null;
  let lockedFunds = null;
  try {
    onChainState = await contractService.getCampaignState(campaign.onChainId);
    lockedFunds = await contractService.getLockedFunds(campaign.onChainId);
  } catch (_) {}

  const collectedAmount = campaign.donations
    .filter(d => ["PAID", "DEPOSITED"].includes(d.status))
    .reduce((sum, d) => sum + BigInt(d.amount), 0n);

  return {
    ...(await _serialize(campaign)),
    collectedAmount: ethers.formatUnits(collectedAmount, 6).split('.')[0],
    onChainState: onChainState !== null ? Number(onChainState) : null,
    lockedFunds,
  };
}

async function generateDraftPlan({ rabData, targetAmount }) {
  const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const aiToken = process.env.AI_INTERNAL_TOKEN || "";

  const items = rabData.map(r => ({
    name: r.item,
    qty: r.qty,
    unit: r.unit,
    unitPrice: r.harga
  }));
  const total = items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);

  let aiNotes = "Sistem telah merumuskan skema pencairan dana (milestones) berdasarkan best-practice untuk meminimalkan risiko. Porsi per-milestone memakai retensi progresif (porsi akhir terbesar).";
  let aiScore = 0;

  try {
    const res = await fetch(`${aiUrl}/evaluate-rab`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Internal-Token": aiToken
      },
      body: JSON.stringify({ items, total, targetAmount }),
    });

    if (res.ok) {
      const aiResult = await res.json();
      aiScore = aiResult.score || 0;
      aiNotes = `AI Review (Skor: ${aiScore}): ${aiResult.notes}`;
    }
  } catch (error) {
    console.warn("AI Microservice unreachable, falling back to mock plan", error.message);
  }

  const advanceAmount = Math.floor(targetAmount * 0.15); 
  return {
    advanceAmount,
    milestoneAmount: targetAmount - advanceAmount, 
    totalMilestones: 3, 
    notes: aiNotes,
    aiScore,
  };
}

async function updateImage(id, imageUrl) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { imageUrl },
  });
  return await _serialize(campaign);
}

async function approve(id) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  try {
    // Skor >= 85 mengindikasikan approval (berdasarkan threshold oracle)
    await oracleService.submitScore(campaign.onChainId, 100, Date.now());
  } catch (error) {
    console.error("[campaignService] Gagal submitScore ke blockchain saat approve:", error);
  }

  return await _serialize(campaign);
}

async function reject(id) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: "REJECTED", aiNotes: "Pengajuan ditolak oleh Dinsos." },
  });
  return await _serialize(campaign);
}

export default { create, list, getById, generateDraftPlan, updateImage, approve, reject };