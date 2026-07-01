const { ethers } = require("ethers");
const prisma = require("../config/prisma");
const midtransService = require("./midtransService");
const tokenService = require("./tokenService");
const contractService = require("./contractService");
const walletService = require("./walletService");

const XIDR_DECIMALS = 6;

/**
 * DonationService — alur donasi custodial:
 *  donatur cukup bayar QRIS. Alamat on-chain-nya di-generate backend
 *  (donatur tidak pernah tahu). Setelah lunas -> mint + deposit ke escrow.
 */
class DonationService {
  async initiate({ campaignId, donorName, amountRupiah }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error("Campaign tidak ditemukan");

    const donorWallet = walletService.generate();

    const orderId = `NEXTRUST-${campaign.onChainId}-${Date.now()}`;
    const qris = await midtransService.createQris(orderId, amountRupiah);

    const amountToken = ethers.parseUnits(
      amountRupiah.toString(),
      XIDR_DECIMALS
    );

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

  async handleWebhook(notification) {
    if (!midtransService.verifySignature(notification)) {
      throw new Error("Signature webhook tidak valid");
    }

    const status = midtransService.interpretStatus(notification);
    const donation = await prisma.donation.findUnique({
      where: { orderId: notification.order_id },
    });
    if (!donation) throw new Error("Donasi tidak ditemukan untuk order ini");

    if (donation.status === "DEPOSITED") {
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

    await prisma.donation.update({
      where: { id: donation.id },
      data: { status: "DEPOSITED", txHashDeposit: dep.txHash },
    });

    return { status: "DEPOSITED", txHash: dep.txHash };
  }

  async listByCampaign(campaignId) {
    const donations = await prisma.donation.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    return donations.map((d) => ({ ...d, amount: d.amount.toString() }));
  }
}

module.exports = new DonationService();
