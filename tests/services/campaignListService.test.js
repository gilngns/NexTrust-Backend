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
    title: "Test Campaign",
    slug: "test-campaign",
    thumbnailUrl: "https://example.com/img.jpg",
    category: "PENDIDIKAN",
    targetAmount: BigInt(1000000),
    totalRaised: BigInt(500000),
    donorCount: 10,
    deadline: new Date("2026-12-31"),
    trustScore: 85,
    isVerified: true,
    foundation: { id: "f-1", name: "Foundation A", isVerified: true },
    ...overrides,
  });

  describe("getCampaignList", () => {
    it("should return paginated campaigns with progress", async () => {
      const mockCampaign = makeCampaign();
      prisma.campaign.findMany.mockResolvedValue([mockCampaign]);
      prisma.campaign.count.mockResolvedValue(1);

      const result = await getCampaignList({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].targetAmount).toBe("1000000");
      expect(result.data[0].totalRaised).toBe("500000");
      expect(result.data[0].progress).toBe(50);
      expect(result.meta).toEqual({
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

    it("should clamp page to min 1 for negative values", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({ page: -5 });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 })
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

    it("should sort by deadline asc when sort=urgent", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({ sort: "urgent" });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { deadline: "asc" },
        })
      );
    });

    it("should default sort to createdAt desc (recent)", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await getCampaignList({});

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should handle progress 0 when targetAmount is 0", async () => {
      const mockCampaign = makeCampaign({
        targetAmount: BigInt(0),
        totalRaised: BigInt(0),
      });
      prisma.campaign.findMany.mockResolvedValue([mockCampaign]);
      prisma.campaign.count.mockResolvedValue(1);

      const result = await getCampaignList({});

      expect(result.data[0].progress).toBe(0);
    });

    it("should cap progress at 100", async () => {
      const mockCampaign = makeCampaign({
        targetAmount: BigInt(100),
        totalRaised: BigInt(200),
      });
      prisma.campaign.findMany.mockResolvedValue([mockCampaign]);
      prisma.campaign.count.mockResolvedValue(1);

      const result = await getCampaignList({});

      expect(result.data[0].progress).toBe(100);
    });

    it("should calculate totalPages correctly", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(25);

      const result = await getCampaignList({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
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
  });
});
