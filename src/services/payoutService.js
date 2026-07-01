const { ethers } = require("ethers");
const prisma = require("../config/prisma");

const XIDR_DECIMALS = 6;

/**
 * PayoutService — pencairan dana dari wallet custodial yayasan ke rekening bank.
 *
 * Setelah dana milestone cair ke wallet custodial yayasan (on-chain), yayasan
 * menarik ke rekening banknya. Di produksi, langkah terakhir memakai layanan
 * disbursement (mis. Midtrans Payout / Iris) untuk transfer Rupiah nyata.
 * Di sini, transfer bank DISIMULASIKAN dan dicatat sebagai Payout.
 */
class PayoutService {
  /**
   * Ajukan pencairan untuk sebuah campaign ke rekening yayasannya.
   * @param {string} campaignId
   * @param {bigint|string} amount - jumlah token yang dicairkan
   */
  async request({ campaignId, amount }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { foundation: true },
    });
    if (!campaign) throw new Error("Campaign tidak ditemukan");

    const foundation = campaign.foundation;
    if (!foundation.bankAccountNo) {
      throw new Error("Yayasan belum mengisi rekening bank");
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

    return this._serialize(payout, foundation);
  }

  /**
   * Proses pencairan (SIMULASI). Di produksi memanggil disbursement API.
   */
  async process(payoutId) {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: { foundation: true },
    });
    if (!payout) throw new Error("Payout tidak ditemukan");
    if (payout.status === "COMPLETED") {
      return this._serialize(payout, payout.foundation);
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

    return this._serialize(updated, updated.foundation);
  }

  async listByCampaign(campaignId) {
    const payouts = await prisma.payout.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    return payouts.map((p) => ({ ...p, amount: p.amount.toString() }));
  }

  _serialize(payout, foundation) {
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
  }
}

module.exports = new PayoutService();
