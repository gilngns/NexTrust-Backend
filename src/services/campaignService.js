import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";
import contractService from "./contractService.js";

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
  rabCID,
  targetAmount,
  advanceAmount,
  milestoneAmount,
  totalMilestones,
  foundationId,
}) => {
  const foundation = await prisma.user.findUnique({
    where: { id: foundationId },
  });
  if (!foundation) throw AppError.notFound();
  if (!foundation.custodialAddress) {
    throw AppError.badRequest();
  }
  const beneficiary = foundation.custodialAddress;

  const onchain = await contractService.createCampaign({
    campaignIdStr: onChainId,
    targetAmount: BigInt(targetAmount),
    advanceAmount: BigInt(advanceAmount),
    milestoneAmount: BigInt(milestoneAmount),
    totalMilestones,
    rabCID: rabCID || "QmPlaceholder",
    beneficiary,
  });

  const campaign = await prisma.campaign.create({
    data: {
      onChainId,
      title,
      description,
      imageUrl,
      rabCID,
      targetAmount: BigInt(targetAmount),
      advanceAmount: BigInt(advanceAmount),
      milestoneAmount: BigInt(milestoneAmount),
      totalMilestones,
      foundationId,
      beneficiary,
      status: "ACTIVE",
      txHashCreate: onchain.txHash,
      milestones: {
        create: Array.from({ length: totalMilestones }, (_, i) => ({
          index: i,
          title: `Milestone ${i + 1}`,
        })),
      },
    },
    include: { milestones: true },
  });

  return await _serialize(campaign);
};

async function list() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { foundation: { select: { name: true } } },
  });
  return await Promise.all(campaigns.map(async (c) => await _serialize(c)));
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

export default { create, list, getById };
