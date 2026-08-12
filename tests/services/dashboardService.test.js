import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    campaign: {
      findMany: jest.fn(),
    },
    donation: {
      findMany: jest.fn(),
    },
  },
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
const dashboardService = (await import("../../src/services/dashboardService.js")).default;

describe("dashboardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getFoundationDashboard", () => {
    const foundationId = "foundation-1";

    it("should return dashboard data with correct structure", async () => {
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: "camp-1",
          status: "ACTIVE",
          targetAmount: BigInt(10000000000),
        },
      ]);

      prisma.donation.findMany.mockResolvedValue([
        {
          amount: BigInt(5000000000),
          donorAddress: "0xabc",
          donorId: null,
          paidAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const result = await dashboardService.getFoundationDashboard(foundationId);

      expect(result).toHaveProperty("totalDonasi");
      expect(result).toHaveProperty("penerimaManfaat");
      expect(result).toHaveProperty("programAktif");
      expect(result).toHaveProperty("tingkatKeberhasilan");
      expect(result).toHaveProperty("grafikDonasi");
      expect(result).toHaveProperty("trends");
    });

    it("should count only active campaigns (exclude DRAFT, COMPLETED, REJECTED, FROZEN)", async () => {
      prisma.campaign.findMany.mockResolvedValue([
        { id: "c-1", status: "ACTIVE", targetAmount: BigInt(1000000) },
        { id: "c-2", status: "DRAFT", targetAmount: BigInt(1000000) },
        { id: "c-3", status: "COMPLETED", targetAmount: BigInt(1000000) },
        { id: "c-4", status: "PENDING_REVIEW", targetAmount: BigInt(1000000) },
      ]);

      prisma.donation.findMany.mockResolvedValue([]);

      const result = await dashboardService.getFoundationDashboard(foundationId);

      expect(result.programAktif).toBe("2");
    });

    it("should count unique donors", async () => {
      prisma.campaign.findMany.mockResolvedValue([
        { id: "c-1", status: "ACTIVE", targetAmount: BigInt(1000000) },
      ]);

      prisma.donation.findMany.mockResolvedValue([
        { amount: BigInt(100000), donorAddress: "0xabc", donorId: null, paidAt: new Date(), createdAt: new Date() },
        { amount: BigInt(200000), donorAddress: "0xabc", donorId: null, paidAt: new Date(), createdAt: new Date() },
        { amount: BigInt(300000), donorAddress: "0xdef", donorId: null, paidAt: new Date(), createdAt: new Date() },
      ]);

      const result = await dashboardService.getFoundationDashboard(foundationId);

      expect(result.penerimaManfaat).toBe("2");
    });

    it("should handle zero campaigns gracefully", async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.donation.findMany.mockResolvedValue([]);

      const result = await dashboardService.getFoundationDashboard(foundationId);

      expect(result.programAktif).toBe("0");
      expect(result.tingkatKeberhasilan).toBe("0%");
    });

    it("should return 6 months of chart data", async () => {
      prisma.campaign.findMany.mockResolvedValue([
        { id: "c-1", status: "ACTIVE", targetAmount: BigInt(1000000) },
      ]);
      prisma.donation.findMany.mockResolvedValue([]);

      const result = await dashboardService.getFoundationDashboard(foundationId);

      expect(result.grafikDonasi).toHaveLength(6);
      result.grafikDonasi.forEach((item) => {
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("total");
      });
    });

    it("should format large donation amounts with Miliar", async () => {
      prisma.campaign.findMany.mockResolvedValue([
        { id: "c-1", status: "ACTIVE", targetAmount: BigInt("10000000000000") },
      ]);

      prisma.donation.findMany.mockResolvedValue([
        {
          amount: BigInt("2000000000000"),
          donorAddress: "0xabc",
          donorId: null,
          paidAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const result = await dashboardService.getFoundationDashboard(foundationId);

      expect(result.totalDonasi).toContain("Rp");
    });

    it("should query donations only with PAID or DEPOSITED status", async () => {
      prisma.campaign.findMany.mockResolvedValue([
        { id: "c-1", status: "ACTIVE", targetAmount: BigInt(1000000) },
      ]);
      prisma.donation.findMany.mockResolvedValue([]);

      await dashboardService.getFoundationDashboard(foundationId);

      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["PAID", "DEPOSITED"] },
          }),
        })
      );
    });

    it("should query donations for all campaign ids of the foundation", async () => {
      prisma.campaign.findMany.mockResolvedValue([
        { id: "c-1", status: "ACTIVE", targetAmount: BigInt(1000000) },
        { id: "c-2", status: "DRAFT", targetAmount: BigInt(2000000) },
      ]);
      prisma.donation.findMany.mockResolvedValue([]);

      await dashboardService.getFoundationDashboard(foundationId);

      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: { in: ["c-1", "c-2"] },
          }),
        })
      );
    });
  });
});
