import { jest } from "@jest/globals";

// Mocks
jest.unstable_mockModule("ethers", () => ({
  ethers: {
    parseUnits: jest.fn(),
    formatUnits: jest.fn(),
  },
}));

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    campaign: {
      findUnique: jest.fn(),
    },
    donation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("../../src/services/midtransService.js", () => ({
  default: {
    createQris: jest.fn(),
    verifySignature: jest.fn(),
    interpretStatus: jest.fn(),
  },
}));

jest.unstable_mockModule("../../src/services/tokenService.js", () => ({
  default: {
    mint: jest.fn(),
    approveEscrow: jest.fn(),
    backendWallet: { address: "0xBackend" },
  },
}));

jest.unstable_mockModule("../../src/services/contractService.js", () => ({
  default: {
    depositXIDR: jest.fn(),
  },
}));

jest.unstable_mockModule("../../src/services/walletService.js", () => ({
  default: {
    generate: jest.fn(),
  },
}));

const prisma = (await import("../../src/config/prisma.js")).default;
const midtransService = (await import("../../src/services/midtransService.js")).default;
const tokenService = (await import("../../src/services/tokenService.js")).default;
const contractService = (await import("../../src/services/contractService.js")).default;
const walletService = (await import("../../src/services/walletService.js")).default;
const donationService = (await import("../../src/services/donationService.js")).default;
const { ethers } = await import("ethers");

describe("donationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initiate", () => {
    it("should initiate donation and return order details", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1" });
      walletService.generate.mockResolvedValue({ address: "0xDonor" });
      midtransService.createQris.mockResolvedValue({ qrisUrl: "http://qris.url" });
      ethers.parseUnits.mockReturnValue(BigInt(100000000));
      prisma.donation.create.mockResolvedValue({
        id: "don-1",
      });

      const payload = { campaignId: "camp-1", donorName: "Alice", amountRupiah: 100000 };
      const result = await donationService.initiate(payload);

      expect(prisma.campaign.findUnique).toHaveBeenCalled();
      expect(walletService.generate).toHaveBeenCalled();
      expect(midtransService.createQris).toHaveBeenCalled();
      expect(ethers.parseUnits).toHaveBeenCalledWith("100000", 6);
      expect(prisma.donation.create).toHaveBeenCalled();
      expect(result.qrisUrl).toBe("http://qris.url");
      expect(result.amountRupiah).toBe(100000);
      expect(result).toHaveProperty("orderId");
    });
  });

  describe("handleWebhook", () => {
    const mockNotification = { order_id: "order-1" };

    it("should throw unauthorized if signature verification fails", async () => {
      midtransService.verifySignature.mockResolvedValue(false);
      await expect(donationService.handleWebhook(mockNotification)).rejects.toThrow("Unauthorized");
    });

    it("should process successful payment and deposit on-chain", async () => {
      midtransService.verifySignature.mockResolvedValue(true);
      midtransService.interpretStatus.mockResolvedValue("PAID");
      prisma.donation.findUnique.mockResolvedValue({
        id: "don-1",
        status: "PENDING",
        campaignId: "camp-1",
        amount: BigInt(100000000),
        donorAddress: "0xDonor",
      });
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1" });
      ethers.formatUnits.mockReturnValue("100");
      tokenService.mint.mockResolvedValue();
      tokenService.approveEscrow.mockResolvedValue();
      contractService.depositXIDR.mockResolvedValue({ txHash: "0xHash" });
      prisma.donation.update.mockResolvedValue({});

      const result = await donationService.handleWebhook(mockNotification);

      expect(result.status).toBe("DEPOSITED");
      expect(result.txHash).toBe("0xHash");
      expect(tokenService.mint).toHaveBeenCalled();
      expect(contractService.depositXIDR).toHaveBeenCalled();
      expect(prisma.donation.update).toHaveBeenCalledTimes(2); // PAID then DEPOSITED
    });
  });

  describe("listByCampaign", () => {
    it("should list donations for a campaign and serialize amount", async () => {
      prisma.donation.findMany.mockResolvedValue([
        { id: "don-1", amount: BigInt(1000) }
      ]);

      const result = await donationService.listByCampaign("camp-1");
      expect(prisma.donation.findMany).toHaveBeenCalled();
      expect(result[0].amount).toBe("1000"); // serialized
    });
  });
});
