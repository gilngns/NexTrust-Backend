import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";
import contractService from "./contractService.js";
import { progressiveRetentionSplit } from "../utils/milestoneSplit.js";

async function _serialize(campaign) {
  const out = { ...campaign };
  for (const k of ["targetAmount", "advanceAmount", "milestoneAmount"]) {
    if (out[k] !== undefined && out[k] !== null) out[k] = out[k].toString();
  }
  if (out.donations) {
    out.donations = out.donations.map((d) => ({
      ...d,
      amount: d.amount.toString(),
    }));
  }
  return out;
}

const create = async ({
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
}) => {
  const foundation = await prisma.user.findUnique({
    where: { id: foundationId },
  });
  if (!foundation) throw AppError.notFound();
  if (!foundation.custodialAddress) {
    throw AppError.badRequest();
  }
  const beneficiary = foundation.custodialAddress;

  const milestoneTotal = BigInt(targetAmount) - BigInt(advanceAmount);
  const milestoneAmounts = progressiveRetentionSplit(
    milestoneTotal,
    totalMilestones,
  );

  const onchain = await contractService.createCampaign({
    campaignIdStr: onChainId,
    targetAmount: BigInt(targetAmount),
    advanceAmount: BigInt(advanceAmount),
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
      targetAmount: BigInt(targetAmount),
      advanceAmount: BigInt(advanceAmount),
      milestoneAmount: milestoneTotal,
      totalMilestones,
      foundationId,
      beneficiary,
      latitude,
      longitude,
      status: "ACTIVE",
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

  return await _serialize(campaign);
};

async function list(status) {
  const campaigns = await prisma.campaign.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { 
      foundation: { select: { name: true } },
      _count: { select: { donations: true } },
      milestones: true
    },
  });
  return await Promise.all(campaigns.map(async (c) => {
    const serialized = await _serialize(c);
    serialized.donorCount = c._count?.donations || 0;
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

  return {
    ...(await _serialize(campaign)),
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
    unitPrice: r.harga
  }));
  const total = items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);

  let aiNotes = "Sistem telah merumuskan skema pencairan dana (milestones) berdasarkan best-practice untuk meminimalkan risiko. Porsi per-milestone memakai retensi progresif (porsi akhir terbesar).";

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
      aiNotes = `AI Review (Skor: ${aiResult.score}): ${aiResult.notes}`;
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
  };
}

async function updateImage(id, imageUrl) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { imageUrl },
  });
  return await _serialize(campaign);
}

export default { create, list, getById, generateDraftPlan, updateImage };