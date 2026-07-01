const { ethers } = require("ethers");
const config = require("../config");
const escrowAbi = require("../../abi/TrustFundEscrow.json");

/**
 * ContractService — satu-satunya tempat backend berbicara dengan blockchain.
 * Semua panggilan on-chain memakai wallet BACKEND (pemegang BACKEND_ROLE).
 */
class ContractService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);
    this.backendWallet = new ethers.Wallet(
      config.chain.backendPrivateKey,
      this.provider
    );
    this.escrow = new ethers.Contract(
      config.chain.escrowAddress,
      escrowAbi,
      this.backendWallet
    );
  }

  toCampaignId(str) {
    return ethers.id(str);
  }

  async status() {
    const [network, blockNumber, balance] = await Promise.all([
      this.provider.getNetwork(),
      this.provider.getBlockNumber(),
      this.provider.getBalance(this.backendWallet.address),
    ]);
    return {
      chainId: Number(network.chainId),
      blockNumber,
      backendAddress: this.backendWallet.address,
      backendBalancePOL: ethers.formatEther(balance),
      escrowAddress: config.chain.escrowAddress,
    };
  }

  async getCampaignState(campaignIdStr) {
    return await this.escrow.getCampaignState(this.toCampaignId(campaignIdStr));
  }

  async getLockedFunds(campaignIdStr) {
    const locked = await this.escrow.getLockedFunds(
      this.toCampaignId(campaignIdStr)
    );
    return locked.toString();
  }

  async getCampaign(campaignIdStr) {
    const c = await this.escrow.getCampaign(this.toCampaignId(campaignIdStr));

    return {
      campaignId: c.campaignId,
      targetAmount: c.targetAmount.toString(),
      totalCollected: c.totalCollected.toString(),
      milestoneAmount: c.milestoneAmount.toString(),
      advanceAmount: c.advanceAmount.toString(),
      totalMilestones: Number(c.totalMilestones),
      currentMilestone: Number(c.currentMilestone),
      state: Number(c.state),
      advanceReleased: c.advanceReleased,
      beneficiary: c.beneficiary,
    };
  }

  async createCampaign({
    campaignIdStr,
    targetAmount,
    advanceAmount,
    milestoneAmount,
    totalMilestones,
    rabCID,
    beneficiary,
  }) {
    const id = this.toCampaignId(campaignIdStr);
    const tx = await this.escrow.createCampaign(
      id,
      targetAmount,
      advanceAmount,
      milestoneAmount,
      totalMilestones,
      rabCID,
      beneficiary
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash, campaignId: id };
  }

  async depositXIDR({ campaignIdStr, amount, donorAddress }) {
    const id = this.toCampaignId(campaignIdStr);
    const tx = await this.escrow.depositXIDR(id, amount, donorAddress);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async releaseAdvance(campaignIdStr) {
    const tx = await this.escrow.releaseAdvance(
      this.toCampaignId(campaignIdStr)
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async submitMilestone({ campaignIdStr, evidenceCID, metadataHash }) {
    const id = this.toCampaignId(campaignIdStr);
    const tx = await this.escrow.submitMilestone(id, evidenceCID, metadataHash);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async releaseMilestone(campaignIdStr) {
    const tx = await this.escrow.releaseMilestone(
      this.toCampaignId(campaignIdStr)
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async resolveFrozen({ campaignIdStr, approve }) {
    const id = this.toCampaignId(campaignIdStr);
    const tx = await this.escrow.resolveFrozen(id, approve);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async claimRefund({ campaignIdStr, donorSigner }) {

    const id = this.toCampaignId(campaignIdStr);
    const tx = await this.escrow.claimRefund(id);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }
}

module.exports = new ContractService();
