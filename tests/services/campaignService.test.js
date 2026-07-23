import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    user: {
      findUnique: jest.fn(),
    },
    campaign: {
      create: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("../../src/services/contractService.js", () => ({
  default: {
    createCampaign: jest.fn(),
  },
}));

const prisma = (await import("../../src/config/prisma.js")).default;
const contractService = (await import("../../src/services/contractService.js")).default;
const campaignService = (await import("../../src/services/campaignService.js")).default;
const AppError = (await import("../../src/utils/AppError.js")).default;

describe("campaignService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const validPayload = {
      onChainId: "chain-id-123",
      title: "Test Campaign",
      description: "Test Description",
      imageUrl: "http://example.com/img.jpg",
      category: "PEMBANGUNAN",
      rabCID: "ipfs-cid",
      targetAmount: 1000000,
      advanceAmount: 100000,
      milestoneAmount: 900000,
      totalMilestones: 2,
      foundationId: "user-123",
    };

    it("should create a campaign successfully", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        custodialAddress: "0x123",
      });

      contractService.createCampaign.mockResolvedValue({
        txHash: "0xabc",
        campaignId: "chain-id-123",
      });

      const mockCampaign = {
        id: "camp-123",
        ...validPayload,
        targetAmount: BigInt("1030000000000"),
        advanceAmount: BigInt("130000000000"),
        milestoneAmount: BigInt("900000000000"),
        beneficiary: "0x123",
        status: "ACTIVE",
        txHashCreate: "0xabc",
        donations: [],
      };

            prisma.campaign.create.mockResolvedValue(mockCampaign);

      const result = await campaignService.create(validPayload);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(contractService.createCampaign).toHaveBeenCalledWith({
        campaignIdStr: validPayload.onChainId,
        targetAmount: BigInt("1030000000000"),
        advanceAmount: BigInt("130000000000"),
        milestoneAmounts: [BigInt("360000000000"), BigInt("540000000000")],
        rabCID: validPayload.rabCID,
        beneficiary: "0x123",
      });
      expect(prisma.campaign.create).toHaveBeenCalled();

      expect(result.targetAmount).toBe("1030000");
    });

    it("should throw notFound if foundation does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(campaignService.create(validPayload)).rejects.toThrow(
        "Not Found" 
      );
    });

    it("should throw badRequest if foundation has no custodialAddress", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        custodialAddress: null,
      });

      await expect(campaignService.create(validPayload)).rejects.toThrow(
        "Bad Request" 
      );
    });
  });

  describe("generateDraftPlan", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("should fetch from AI service and return plan", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ score: 90, notes: "Good" })
      });

      const res = await campaignService.generateDraftPlan({ rabData: [{item: "A", qty: 1, harga: 10}], targetAmount: 100 });
      expect(res.advanceAmount).toBe(15);
      expect(res.notes).toContain("Good");
      expect(global.fetch).toHaveBeenCalled();
    });

    it("should fallback to mock if AI service fails", async () => {
      global.fetch.mockRejectedValue(new Error("Network Error"));

      const res = await campaignService.generateDraftPlan({ rabData: [{item: "A", qty: 1, harga: 10}], targetAmount: 100 });
      expect(res.advanceAmount).toBe(15);
      expect(res.totalMilestones).toBe(3);
    });
  });
});
