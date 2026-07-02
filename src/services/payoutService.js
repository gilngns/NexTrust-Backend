import { ethers } from 'ethers';
import AppError from '../utils/AppError.js';
import prisma from '../config/prisma.js';

const XIDR_DECIMALS = 6;

async function _serialize(payout, foundation) {
  return {
    id: payout.id,
    amount: payout.amount.toString(),
    amountRupiah: ethers.formatUnits(payout.amount, XIDR_DECIMALS),
    status: payout.status,
    bank: {
      name: payout.bankName,
      accountNo: payout.bankAccountNo,
      holder: foundation ? foundation.bankHolder : null,
    },
    payoutRef: payout.payoutRef,
    note: payout.note,
  };
};

async function request({ campaignId, amount }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { foundation: true },
  });
  if (!campaign) throw AppError.notFound();

  const foundation = campaign.foundation;
  if (!foundation.bankAccountNo) {
    throw AppError.badRequest();
  }

  const payout = await prisma.payout.create({
    data: {
      campaignId,
      foundationId: foundation.id,
      amount: BigInt(amount),
      status: "PENDING",
      bankName: foundation.bankName,
      bankAccountNo: foundation.bankAccountNo,
      note: "Menunggu pencairan ke rekening (simulasi)",
    },
  });

  return await _serialize(payout, foundation);
};

async function process(payoutId) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { foundation: true },
  });
  if (!payout) throw AppError.notFound();
  if (payout.status === "COMPLETED") {
    return await _serialize(payout, payout.foundation);
  }

  const fakeRef = "SIM-" + Date.now();
  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "COMPLETED",
      payoutRef: fakeRef,
      note: "Dana berhasil dicairkan ke rekening (simulasi)",
    },
    include: { foundation: true },
  });

  return await _serialize(updated, updated.foundation);
};

async function listByCampaign(campaignId) {
  const payouts = await prisma.payout.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });
  return payouts.map((p) => ({ ...p, amount: p.amount.toString() }));
};

export default { request, process, listByCampaign };
