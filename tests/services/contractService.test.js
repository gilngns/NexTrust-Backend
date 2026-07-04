import { jest } from "@jest/globals";

// Mock ethers before importing the service
const mockContractInstance = {
  getCampaignState: jest.fn(),
  getLockedFunds: jest.fn(),
  getCampaign: jest.fn(),
  createCampaign: jest.fn(),
  depositXIDR: jest.fn(),
  releaseAdvance: jest.fn(),
  submitMilestone: jest.fn(),
  releaseMilestone: jest.fn(),
  resolveFrozen: jest.fn(),
  claimRefund: jest.fn(),
};

jest.unstable_mockModule("ethers", () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1337 }),
      getBlockNumber: jest.fn().mockResolvedValue(100),
      getBalance: jest.fn().mockResolvedValue(BigInt(1000000000000000000)), // 1 ETH
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      address: "0xBackendWallet",
    })),
    Contract: jest.fn().mockImplementation(() => mockContractInstance),
    id: jest.fn().mockReturnValue("0xHashedId"),
    formatEther: jest.fn().mockReturnValue("1.0"),
  },
}));

const { ethers } = await import("ethers");
const contractService = (await import("../../src/services/contractService.js")).default;

describe("contractService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("status", () => {
    it("should return network and backend balance status", async () => {
      const stat = await contractService.status();
      expect(stat.chainId).toBe(1337);
      expect(stat.blockNumber).toBe(100);
      expect(stat.backendAddress).toBe("0xBackendWallet");
      expect(stat.backendBalancePOL).toBe("1.0");
    });
  });

  describe("Campaign write functions", () => {
    it("should call createCampaign and wait for tx", async () => {
      mockContractInstance.createCampaign.mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: "0xTxHash" }),
      });

      const res = await contractService.createCampaign({
        campaignIdStr: "camp-1",
        targetAmount: BigInt(100),
        advanceAmount: BigInt(10),
        milestoneAmounts: [BigInt(36), BigInt(54)], // array retensi progresif
        rabCID: "cid",
        beneficiary: "0xBen",
      });

      expect(mockContractInstance.createCampaign).toHaveBeenCalledWith(
        "0xHashedId",
        BigInt(100),
        BigInt(10),
        [BigInt(36), BigInt(54)],
        "cid",
        "0xBen"
      );
      expect(res.txHash).toBe("0xTxHash");
      expect(res.campaignId).toBe("0xHashedId");
    });

    it("should call depositXIDR and wait for tx", async () => {
      mockContractInstance.depositXIDR.mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: "0xTxHash2" }),
      });

      const res = await contractService.depositXIDR({
        campaignIdStr: "camp-1",
        amount: BigInt(50),
        donorAddress: "0xDonor",
      });

      expect(mockContractInstance.depositXIDR).toHaveBeenCalledWith("0xHashedId", BigInt(50), "0xDonor");
      expect(res.txHash).toBe("0xTxHash2");
    });
  });
});
