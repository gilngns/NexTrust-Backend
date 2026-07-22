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

/**
 * MockPayout — meniru bentuk & lifecycle Midtrans Payouts (Iris) API asli:
 * reference_no, status queued/completed, beneficiary info. Disimulasikan
 * karena disbursement asli (Midtrans Payouts) butuh akun & verifikasi bisnis
 * terpisah dari akun Snap yang dipakai untuk QRIS masuk — sama seperti
 * MockXIDR mensimulasikan sisi on-chain untuk keperluan demo hackathon.
 * Gampang diganti ke integrasi Midtrans Payouts asli nanti: tinggal ganti
 * isi `_transferToBank()` dengan pemanggilan API sungguhan.
 */
function _fakeReferenceNo() {
  return "MOCKPAY-" + crypto.randomBytes(6).toString("hex");
}

async function _transferToBank({ bankName, bankAccountNo, amountRupiah }) {
  // Placeholder untuk integrasi Midtrans Payouts (Iris) di masa depan:
  //   const res = await irisService.createPayout({ beneficiary_bank: bankName,
  //     beneficiary_account: bankAccountNo, amount: amountRupiah, ... });
  //   return { referenceNo: res.reference_no, raw: res };
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
    // Notifikasi gagal tidak boleh menggagalkan pencairan dana.
    console.warn("[payoutService] gagal membuat notifikasi:", err.message);
  }
}

/**
 * Alur otomatis: dipanggil oleh milestoneService setelah escrow melepas dana
 * on-chain ke wallet custodial yayasan. Membakar MockXIDR yang baru diterima
 * (menutup loop token), lalu "mencairkan" nominal yang sama sebagai rupiah
 * ke rekening bank yayasan — yayasan tidak pernah berurusan dengan crypto.
 *
 * @param {string} campaignId
 * @param {bigint|string} amountUnits - nominal dalam satuan token XIDR (6 desimal)
 * @param {string} label - contoh: "Uang Muka" atau "Milestone #2"
 */
async function autoDisburse({ campaignId, amountUnits, label }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { foundation: true },
  });
  if (!campaign) throw AppError.notFound("Kampanye tidak ditemukan.");

  const foundation = campaign.foundation;
  const grossAmount = BigInt(amountUnits || 0);
  const platformFee = (grossAmount * 3n) / 100n;
  const netAmount = grossAmount - platformFee;

  if (!foundation.bankAccountNo || !foundation.bankName) {
    // Dana tetap "aman" di wallet custodial yayasan (belum di-burn), hanya
    // pencairan ke rekening yang tertunda — yayasan perlu lengkapi data bank.
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

  // Kirim XIDR dari wallet custodial yayasan ke burn address — best effort.
  // Ini transfer ERC20 standar (bukan fungsi khusus kontrak), jadi harusnya
  // selalu berhasil selama wallet yayasan punya cukup saldo & gas (POL) di
  // Amoy. Tetap dibungkus try/catch: kegagalan apa pun di sini (mis. wallet
  // kehabisan POL buat gas) TIDAK BOLEH menahan pencairan rupiah yayasan.
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

// --- Endpoint manual (dipakai ADMIN untuk lihat/retry, bukan jalur utama lagi) ---

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