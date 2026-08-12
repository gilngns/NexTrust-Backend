import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    campaign: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("../../src/config/cache.js", () => ({
  cachedSWR: jest.fn((key, ttl, fn) => fn()),
}));

jest.unstable_mockModule("ethers", () => ({
  ethers: {
    formatUnits: jest.fn((value, decimals) => {
      const num = Number(value);
      const divisor = Math.pow(10, decimals);
      return (num / divisor).toFixed(decimals);
    }),
  },
}));

const prisma = (await import("../../src/config/prisma.js")).default;
const { cachedSWR } = await import("../../src/config/cache.js");
const { getCampaignList } = await import("../../src/services/campaignListService.js");

describe("campaignListService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cachedSWR.mockImplementation((key, ttl, fn) => fn());
  });

  const makeCampaign = (overrides = {}) => ({
    id: "camp-1",
    onChainId: "chain-1",
    title: "Test Campaign",
    description: "Test",
    imageUrl: "https://example.com/img.jpg",
    category: "PENDIDIKAN",
    status: "ACTIVE",
    targetAmount: BigInt(1000000000000),
    advanceAmount: BigInt(150000000000),
    milestoneAmount: BigInt(850000000000),
    totalMilestones: 3,
    totalRaised: 500000000000,
    donorCount: 10,
    aiScore: 90,
    createdAt: new Date(),
    txHashCreate: "0xabc",
    foundation: { name: "Foundation A" },
    milestones: [],
    ...overrides,
  });

  describe("getCampaignList", () => {
    it("should return paginated campaigns with ok:true", async () => {
      const mockCampaign = makeCampaign();
      prisma.campaign.findMany.mockResolvedValue([mockCampaign]);
      prisma.campaign.count.mockResolvedValue(1);

      const result = await getCampaignList({ page: 1, limit: 10 });

      expect(result.ok).toBe(true);
      expect(result.campaigns).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it("should default to page 1 and limit 10", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({});

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });

    it("should clamp limit to max 50", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({ limit: 999 });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it("should filter by category when provided", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({ category: "PENDIDIKAN" });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "PENDIDIKAN" }),
        })
      );
    });

    it("should filter by status when provided", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({ status: "ACTIVE" });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "ACTIVE" }),
        })
      );
    });

    it("should sort by donorCount desc when sort=popular", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({ sort: "popular" });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { donorCount: "desc" },
        })
      );
    });

    it("should default sort to createdAt desc", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({});

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should include explorerUrl when txHashCreate exists", async () => {
      const mockCampaign = makeCampaign({ txHashCreate: "0xdef" });
      prisma.campaign.findMany.mockResolvedValue([mockCampaign]);
      prisma.campaign.count.mockResolvedValue(1);

      const result = await getCampaignList({});

      expect(result.campaigns[0].explorerUrl).toContain("0xdef");
    });

    it("should use cachedSWR for caching", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({ page: 1, limit: 10 });

      expect(cachedSWR).toHaveBeenCalledWith(
        expect.stringContaining("campaigns:list"),
        60000,
        expect.any(Function)
      );
    });

    it("should not load donations in the query", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({});

      const selectArg = prisma.campaign.findMany.mock.calls[0][0].select;
      expect(selectArg.donations).toBeUndefined();
    });
  });
});
