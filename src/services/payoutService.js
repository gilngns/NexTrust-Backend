import { ethers } from "ethers";
import crypto from "crypto";
import AppError from "../utils/AppError.js";
import prisma from "../config/prisma.js";
import tokenService from "./tokenService.js";

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
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
  };
}

function _fakeReferenceNo() {
  return "MOCKPAY-" + crypto.randomBytes(6).toString("hex");
}

async function _transferToBank({ bankName, bankAccountNo, amountRupiah }) {
  
  
  
  
  return {
    referenceNo: _fakeReferenceNo(),
    raw: { status: "completed", simulated: true },
  };
}

async function _notifyFoundation(foundationId, { title, message, link }) {
  try {
    await prisma.notification.create({
      data: { userId: foundationId, title, message, link, type: "INFO" },
    });
  } catch (err) {
    
    console.warn("[payoutService] gagal membuat notifikasi:", err.message);
  }
}

async function autoDisburse({ campaignId, amountUnits, label }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { foundation: true },
  });
  if (!campaign) throw AppError.notFound("Kampanye tidak ditemukan.");

  const foundation = campaign.foundation;
  const grossAmount = BigInt(amountUnits || 0);
  
  let platformFee = 0n;
  
  
  if (label.toLowerCase().includes("uang muka") || label.toLowerCase().includes("dp") || label.toLowerCase().includes("advance")) {
    const targetToken = BigInt(campaign.targetAmount);
    
    
    platformFee = (targetToken * 3n) / 103n;
  }
  
  const netAmount = grossAmount - platformFee;

  if (!foundation.bankAccountNo || !foundation.bankName) {
    
    
    const payout = await prisma.payout.create({
      data: {
        campaignId,
        foundationId: foundation.id,
        amount: netAmount,
        status: "PENDING",
        note: `${label}: menunggu data rekening bank. (Nominal telah dipotong platform fee 3%)`,
      },
    });
    await _notifyFoundation(foundation.id, {
      title: "Lengkapi data rekening",
      message: `${label} sudah disetujui, tapi pencairan tertahan karena data rekening bank belum lengkap.`,
      link: "/yayasan/settings",
    });
    return await _serialize(payout, foundation);
  }

  const payout = await prisma.payout.create({
    data: {
      campaignId,
      foundationId: foundation.id,
      amount: netAmount,
      status: "PENDING",
      bankName: foundation.bankName,
      bankAccountNo: foundation.bankAccountNo,
      note: `${label}: memproses pencairan. (Termasuk potongan fee 3%)`,
    },
  });

  
  
  
  
  
  let burnTxHash = null;
  try {
    const humanAmount = ethers.formatUnits(grossAmount, XIDR_DECIMALS);
    const burnResult = await tokenService.burnFromFoundation(
      foundation.encryptedKey,
      humanAmount,
    );
    burnTxHash = burnResult.txHash;
  } catch (err) {
    console.warn(
      `[payoutService] transfer XIDR ke burn address gagal untuk payout ${payout.id} (campaign ${campaignId}): ${err.message}`,
    );
  }

  const { referenceNo } = await _transferToBank({
    bankName: foundation.bankName,
    bankAccountNo: foundation.bankAccountNo,
    amountRupiah: ethers.formatUnits(netAmount, XIDR_DECIMALS),
  });

  const note = burnTxHash
    ? `${label}: dana cair ke rekening (Potongan Fee 3%). XIDR di-burn: tx ${burnTxHash}.`
    : `${label}: dana cair ke rekening (Potongan Fee 3%). Transfer XIDR ke burn address gagal.`;

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: { status: "COMPLETED", payoutRef: referenceNo, note },
    include: { foundation: true },
  });

  await _notifyFoundation(foundation.id, {
    title: "Dana cair ke rekening",
    message: `${label} bersih sebesar Rp${Number(
      ethers.formatUnits(netAmount, XIDR_DECIMALS),
    ).toLocaleString("id-ID")} sudah masuk ke rekening ${foundation.bankName} ****${foundation.bankAccountNo.slice(-4)}.`,
    link: `/yayasan/donations`,
  });

  return await _serialize(updated, updated.foundation);
}



async function request({ campaignId, amount }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { foundation: true },
  });
  if (!campaign) throw AppError.notFound();

  const foundation = campaign.foundation;
  if (!foundation.bankAccountNo) {
    throw AppError.badRequest("Yayasan belum melengkapi data rekening bank.");
  }

  const payout = await prisma.payout.create({
    data: {
      campaignId,
      foundationId: foundation.id,
      amount: BigInt(amount),
      status: "PENDING",
      bankName: foundation.bankName,
      bankAccountNo: foundation.bankAccountNo,
      note: "Menunggu pencairan ke rekening (manual).",
    },
  });

  return await _serialize(payout, foundation);
}

async function process(payoutId) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { foundation: true },
  });
  if (!payout) throw AppError.notFound();
  if (payout.status === "COMPLETED") {
    return await _serialize(payout, payout.foundation);
  }

  const { referenceNo } = await _transferToBank({
    bankName: payout.bankName,
    bankAccountNo: payout.bankAccountNo,
    amountRupiah: ethers.formatUnits(payout.amount, XIDR_DECIMALS),
  });

  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "COMPLETED",
      payoutRef: referenceNo,
      note: "Dana berhasil dicairkan ke rekening (manual, simulasi).",
    },
    include: { foundation: true },
  });

  return await _serialize(updated, updated.foundation);
}

async function listByCampaign(campaignId) {
  const payouts = await prisma.payout.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });
  return payouts.map((p) => ({ 
    ...p, 
    amount: ethers.formatUnits(p.amount, XIDR_DECIMALS).split('.')[0] 
  }));
}

export default { autoDisburse, request, process, listByCampaign };