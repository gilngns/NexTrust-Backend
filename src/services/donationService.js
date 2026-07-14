import { ethers } from "ethers";
import AppError from "../utils/AppError.js";
import prisma from "../config/prisma.js";
import midtransService from "./midtransService.js";
import tokenService from "./tokenService.js";
import contractService from "./contractService.js";
import walletService from "./walletService.js";

const XIDR_DECIMALS = 6;

async function initiate({ campaignId, donorName, amountRupiah }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw AppError.notFound();
  const donorWallet = await walletService.generate();

  const orderId = `NEXTRUST-${campaign.onChainId}-${Date.now()}`;
  const qris = await midtransService.createQris(orderId, amountRupiah);

  const amountToken = ethers.parseUnits(amountRupiah.toString(), XIDR_DECIMALS);

  const donation = await prisma.donation.create({
    data: {
      campaignId,
      donorName,
      donorAddress: donorWallet.address,
      amount: amountToken,
      status: "PENDING",
      orderId,
      qrisUrl: qris.qrisUrl,
    },
  });

  return {
    donationId: donation.id,
    orderId,
    qrisUrl: qris.qrisUrl,
    amountRupiah,
  };
}

async function handleWebhook(notification) {
  if (!(await midtransService.verifySignature(notification))) {
    throw AppError.unauthorized();
  }

  const status = await midtransService.interpretStatus(notification);
  const donation = await prisma.donation.findUnique({
    where: { orderId: notification.order_id },
  });
  if (!donation) throw AppError.notFound();

  if (donation.status === "DEPOSITED" || donation.status === "PAID") {
    return { status: "already_processed" };
  }

  if (status !== "PAID") {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { status },
    });
    return { status };
  }

  // Update status to PAID immediately to prevent concurrent retries from processing again
  await prisma.donation.update({
    where: { id: donation.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  // Run blockchain transactions in the background so we can respond to Midtrans immediately
  settleDonation(donation.id).catch((err) => {
    console.error(`[Background] settleDonation failed for ${donation.id}:`, err);
  });

  return { status: "PAID", message: "processing_in_background" };
}

async function settleDonation(donationId) {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
  });
  if (!donation) throw AppError.notFound("Donasi tidak ditemukan.");

  if (donation.status === "DEPOSITED") {
    return { status: "already_processed", donation };
  }
  
  if (donation.status === "EXPIRED" || donation.status === "FAILED") {
    throw AppError.badRequest("Status donasi sudah final dan tidak dapat diproses.");
  }

  if (donation.status !== "PAID") {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: donation.campaignId },
  });

  const amountHuman = ethers.formatUnits(donation.amount, XIDR_DECIMALS);
  await tokenService.mint(tokenService.backendWallet.address, amountHuman);
  await tokenService.approveEscrow(amountHuman);

  const dep = await contractService.depositXIDR({
    campaignIdStr: campaign.onChainId,
    amount: donation.amount,
    donorAddress: donation.donorAddress,
  });

  const updatedDonation = await prisma.donation.update({
    where: { id: donation.id },
    data: { status: "DEPOSITED", txHashDeposit: dep.txHash },
  });

  return { status: "DEPOSITED", txHash: dep.txHash, donation: updatedDonation };
}

async function listByCampaign(campaignId) {
  const donations = await prisma.donation.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });
  return donations.map((d) => ({ 
    ...d, 
    amount: d.amount.toString(),
    explorerUrl: d.txHashDeposit ? `https://amoy.polygonscan.com/tx/${d.txHashDeposit}` : null,
  }));
}

/**
 * Dipakai frontend untuk polling status pembayaran (mis. auto-lanjut ke
 * layar sukses begitu status berubah jadi DEPOSITED), tanpa perlu webhook
 * langsung ke browser. Sengaja hanya mengembalikan field minimal — tidak
 * ada data sensitif donatur lain yang bocor lewat endpoint publik ini.
 */
async function getStatusByOrderId(orderId) {
  const donation = await prisma.donation.findUnique({ where: { orderId } });
  if (!donation) throw AppError.notFound("Donasi tidak ditemukan.");
  return {
    orderId: donation.orderId,
    status: donation.status,
    txHash: donation.txHashDeposit || null,
    explorerUrl: donation.txHashDeposit ? `https://amoy.polygonscan.com/tx/${donation.txHashDeposit}` : null,
  };
}

export default { initiate, handleWebhook, listByCampaign, getStatusByOrderId, settleDonation };
