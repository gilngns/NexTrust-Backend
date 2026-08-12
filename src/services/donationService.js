import { ethers } from "ethers";
import AppError from "../utils/AppError.js";
import prisma from "../config/prisma.js";
import midtransService from "./midtransService.js";
import tokenService from "./tokenService.js";
import contractService from "./contractService.js";
import walletService from "./walletService.js";

const XIDR_DECIMALS = 6;

async function initiate({ campaignId, donorId, donorName, amountRupiah }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw AppError.notFound();

  if (campaign.status !== "ACTIVE") {
    throw AppError.badRequest(
      campaign.status === "DRAFT"
        ? "Kampanye ini masih menunggu ACC (persetujuan) Dinsos karena skor RAB di bawah 85, sehingga belum bisa menerima donasi."
        : "Kampanye ini sedang tidak aktif menerima donasi."
    );
  }

  const onChainState = await contractService.getCampaignState(campaign.onChainId);
  if (onChainState !== 0n) { 
    throw AppError.badRequest("Kampanye sudah mencapai target atau tidak aktif.");
  }

  const donorWallet = await walletService.generate();

  const orderId = `NEXTRUST-${campaign.onChainId}-${Date.now()}`;
  const qris = await midtransService.createQris(orderId, amountRupiah);

  const amountToken = ethers.parseUnits(amountRupiah.toString(), XIDR_DECIMALS);

  const donation = await prisma.donation.create({
    data: {
      campaignId,
      donorId,
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

  
  await prisma.donation.update({
    where: { id: donation.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  
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
    amount: ethers.formatUnits(d.amount, 6).split('.')[0],
    explorerUrl: d.txHashDeposit ? `https://amoy.polygonscan.com/tx/${d.txHashDeposit}` : null,
  }));
}

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

async function getDonorGraph(campaignId, currentUserId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, title: true }
  });
  if (!campaign) throw AppError.notFound("Kampanye tidak ditemukan.");

  const allDonations = await prisma.donation.findMany({
    where: { campaignId, status: { in: ["DEPOSITED", "PAID"] } },
    orderBy: { amount: "desc" },
  });

  const totalRaisedBigInt = allDonations.reduce((sum, d) => sum + d.amount, 0n);
  const totalRaisedHuman = ethers.formatUnits(totalRaisedBigInt, XIDR_DECIMALS).split('.')[0];
  const totalRaisedFormatted = `Rp${Number(totalRaisedHuman).toLocaleString('id-ID')}`;

  const donorCount = allDonations.length;

  let topDonations = allDonations.slice(0, 10);
  
  if (currentUserId) {
    const currentUserDonations = allDonations.filter(d => d.donorId === currentUserId);
    if (currentUserDonations.length > 0) {
      const userDonationIds = new Set(currentUserDonations.map(d => d.id));
      const hasUserDonation = topDonations.some(d => userDonationIds.has(d.id));
      
      if (!hasUserDonation) {
        const largestUserDonation = currentUserDonations[0];
        if (topDonations.length === 10) {
          topDonations[9] = largestUserDonation;
        } else {
          topDonations.push(largestUserDonation);
        }
      }
    }
  }

  const formattedDonations = topDonations.map(d => {
    const amountHuman = ethers.formatUnits(d.amount, XIDR_DECIMALS).split('.')[0];
    return {
      id: d.id,
      donorName: d.donorName || "Hamba Allah",
      amount: amountHuman,
      amountFormatted: `Rp${Number(amountHuman).toLocaleString('id-ID')}`,
      status: d.status,
      isCurrentUser: currentUserId ? (d.donorId === currentUserId) : false,
      explorerUrl: d.txHashDeposit ? `https://amoy.polygonscan.com/tx/${d.txHashDeposit}` : null
    };
  });

  return {
    campaignId: campaign.id,
    campaignName: campaign.title,
    donorCount,
    totalRaised: totalRaisedHuman,
    totalRaisedFormatted,
    donations: formattedDonations
  };
}

export default { initiate, handleWebhook, listByCampaign, getStatusByOrderId, settleDonation, getDonorGraph };
