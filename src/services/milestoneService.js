const { ethers } = require("ethers");
const prisma = require("../config/prisma");
const contractService = require("./contractService");
const oracleService = require("./oracleService");

const APPROVE_THRESHOLD = 85;

/**
 * MilestoneService — alur milestone:
 *  submit bukti -> AI kirim skor (oracleCallback) -> release dana.
 */
class MilestoneService {
  /** Yayasan submit bukti milestone. */
  async submit({ campaignId, index, evidenceCID, metadataHash, title }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error("Campaign tidak ditemukan");

    const hash =
      metadataHash ||
      ethers.keccak256(ethers.toUtf8Bytes(evidenceCID || "evidence"));

    const onchain = await contractService.submitMilestone({
      campaignIdStr: campaign.onChainId,
      evidenceCID: evidenceCID || "QmEvidence",
      metadataHash: hash,
    });

    const milestone = await prisma.milestone.update({
      where: { campaignId_index: { campaignId, index } },
      data: {
        evidenceCID,
        metadataHash: hash,
        title: title || undefined,
        status: "SUBMITTED",
        txHashSubmit: onchain.txHash,
      },
    });

    return { ...milestone, txHash: onchain.txHash };
  }

  /**
   * Terima skor dari sistem AI (Favian), teruskan ke kontrak via oracleCallback.
   * @param {number} nonce - nonce oracle untuk campaign ini
   */
  async submitScore({ campaignId, index, score, nonce }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error("Campaign tidak ditemukan");

    const onchain = await oracleService.submitScore(
      campaign.onChainId,
      score,
      nonce
    );

    const status = score >= APPROVE_THRESHOLD ? "APPROVED" : "REJECTED";
    const milestone = await prisma.milestone.update({
      where: { campaignId_index: { campaignId, index } },
      data: { aiScore: score, status, txHashOracle: onchain.txHash },
    });

    return { ...milestone, txHash: onchain.txHash, decision: status };
  }

  /** Cairkan advance (setelah VALIDATED). */
  async releaseAdvance(campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error("Campaign tidak ditemukan");

    const onchain = await contractService.releaseAdvance(campaign.onChainId);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "ADVANCE_PAID" },
    });
    return { txHash: onchain.txHash };
  }

  /** Cairkan milestone yang tervalidasi. */
  async release({ campaignId, index }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error("Campaign tidak ditemukan");

    const onchain = await contractService.releaseMilestone(campaign.onChainId);
    const milestone = await prisma.milestone.update({
      where: { campaignId_index: { campaignId, index } },
      data: { status: "RELEASED", txHashRelease: onchain.txHash },
    });
    return { ...milestone, txHash: onchain.txHash };
  }
}

module.exports = new MilestoneService();
