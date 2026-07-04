import { jest } from "@jest/globals";

jest.unstable_mockModule("ethers", () => ({
  ethers: {
    formatUnits: jest.fn().mockReturnValue("100"),
  },
}));

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    campaign: {
      findUnique: jest.fn(),
    },
    payout: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const prisma = (await import("../../src/config/prisma.js")).default;
const payoutService = (await import("../../src/services/payoutService.js")).default;

describe("payoutService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("request", () => {
    it("should request a payout successfully", async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: "camp-1",
        foundation: {
          id: "found-1",
          bankName: "BCA",
          bankAccountNo: "12345",
          bankHolder: "Yayasan",
        },
      });

      prisma.payout.create.mockResolvedValue({
        id: "pay-1",
        amount: BigInt(100000000),
        status: "PENDING",
        bankName: "BCA",
        bankAccountNo: "12345",
      });

      const res = await payoutService.request({ campaignId: "camp-1", amount: 100000000 });

      expect(prisma.payout.create).toHaveBeenCalled();
      expect(res.id).toBe("pay-1");
      expect(res.bank.accountNo).toBe("12345");
      expect(res.amountRupiah).toBe("100");
    });

    it("should throw badRequest if foundation has no bankAccountNo", async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: "camp-1",
        foundation: {
          id: "found-1",
        },
      });

      await expect(payoutService.request({ campaignId: "camp-1", amount: 100 })).rejects.toThrow("Bad Request");
    });
  });

  describe("process", () => {
    it("should process and mark payout as COMPLETED", async () => {
      prisma.payout.findUnique.mockResolvedValue({
        id: "pay-1",
        status: "PENDING",
        foundation: { bankHolder: "Yayasan" },
        amount: BigInt(100000000),
      });

      prisma.payout.update.mockResolvedValue({
        id: "pay-1",
        status: "COMPLETED",
        payoutRef: "SIM-123",
        amount: BigInt(100000000),
      });

      const res = await payoutService.process("pay-1");
      
      expect(prisma.payout.update).toHaveBeenCalled();
      expect(res.status).toBe("COMPLETED");
      expect(res.payoutRef).toBe("SIM-123");
    });
  });
});
