import { jest } from "@jest/globals";

jest.unstable_mockModule("ethers", () => ({
  ethers: {
    keccak256: jest.fn().mockReturnValue("0xHashed"),
    toUtf8Bytes: jest.fn().mockReturnValue("bytes"),
  },
}));

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    campaign: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    milestone: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("../../src/services/contractService.js", () => ({
  default: {
    submitMilestone: jest.fn(),
    releaseAdvance: jest.fn(),
    releaseMilestone: jest.fn(),
  },
}));

jest.unstable_mockModule("../../src/services/oracleService.js", () => ({
  default: {
    submitScore: jest.fn(),
  },
}));

const prisma = (await import("../../src/config/prisma.js")).default;
const contractService = (await import("../../src/services/contractService.js")).default;
const oracleService = (await import("../../src/services/oracleService.js")).default;
const milestoneService = (await import("../../src/services/milestoneService.js")).default;

describe("milestoneService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submit", () => {
    it("should submit a milestone successfully", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1", latitude: -6.2, longitude: 106.8 });
      prisma.milestone.findUnique.mockResolvedValue({ submitAttempts: 0 });
      contractService.submitMilestone.mockResolvedValue({ txHash: "0xSubmitHash" });
      prisma.milestone.update.mockResolvedValue({ status: "SUBMITTED" });

      const res = await milestoneService.submit({
        campaignId: "camp-1",
        index: 0,
        evidenceCID: "cid",
        latitude: -6.2001,
        longitude: 106.8001
      });

      expect(prisma.campaign.findUnique).toHaveBeenCalled();
      expect(contractService.submitMilestone).toHaveBeenCalledWith({
        campaignIdStr: "chain-1",
        evidenceCID: "cid",
        metadataHash: "0xHashed",
      });
      expect(prisma.milestone.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: "SUBMITTED",
          latitude: -6.2001,
          longitude: 106.8001
        })
      }));
      expect(res.txHash).toBe("0xSubmitHash");
    });
    it("should flag for evaluation if GPS distance > 200m", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1", latitude: -6.2, longitude: 106.8 });
      prisma.milestone.findUnique.mockResolvedValue({ submitAttempts: 0 });
      contractService.submitMilestone.mockResolvedValue({ txHash: "0xSubmitHash" });
      prisma.milestone.update.mockResolvedValue({ status: "EVALUATING" });

      const res = await milestoneService.submit({
        campaignId: "camp-1",
        index: 0,
        evidenceCID: "cid",
        latitude: -6.5, // Far away
        longitude: 106.8
      });

      expect(prisma.milestone.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: "EVALUATING"
        })
      }));
    });

    it("should escalate to Dinsos review after max submit attempts", async () => {
      // Sudah 2x gagal sebelumnya -> submit ke-3 wajib review (fallback §8.2).
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1", latitude: -6.2, longitude: 106.8 });
      prisma.milestone.findUnique.mockResolvedValue({ submitAttempts: 2 });
      contractService.submitMilestone.mockResolvedValue({ txHash: "0xSubmitHash" });
      prisma.milestone.update.mockResolvedValue({ status: "EVALUATING" });

      const res = await milestoneService.submit({
        campaignId: "camp-1",
        index: 0,
        evidenceCID: "cid",
        latitude: -6.2001, // lokasi dekat (dalam radius) — tetap eskalasi krn attempts
        longitude: 106.8001
      });

      expect(prisma.milestone.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "EVALUATING", submitAttempts: 3 })
      }));
      expect(res.escalated).toBe(true);
    });
  });

  describe("submitScore", () => {
    it("should score a milestone and mark as APPROVED if score >= 85", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1" });
      oracleService.submitScore.mockResolvedValue({ txHash: "0xScoreHash" });
      prisma.milestone.update.mockResolvedValue({ status: "APPROVED" });

      const res = await milestoneService.submitScore({
        campaignId: "camp-1",
        index: 0,
        score: 90,
        nonce: 1,
      });

      expect(oracleService.submitScore).toHaveBeenCalledWith("chain-1", 90, 1);
      expect(prisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "APPROVED", aiScore: 90 }),
        })
      );
      expect(res.decision).toBe("APPROVED");
    });

    it("should mark as EVALUATING (review Dinsos) for grey-zone score 50-84", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1" });
      oracleService.submitScore.mockResolvedValue({ txHash: "0xScoreHash" });
      prisma.milestone.update.mockResolvedValue({ status: "EVALUATING" });

      const res = await milestoneService.submitScore({
        campaignId: "camp-1",
        index: 0,
        score: 80,
        nonce: 1,
      });

      // Abu-abu TIDAK ditolak mentah; naik ke Dinsos (selaras kontrak: FROZEN).
      expect(prisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "EVALUATING", aiScore: 80 }),
        })
      );
      expect(res.decision).toBe("EVALUATING");
    });

    it("should mark as REJECTED for failing score < 50", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1" });
      oracleService.submitScore.mockResolvedValue({ txHash: "0xScoreHash" });
      prisma.milestone.update.mockResolvedValue({ status: "REJECTED" });

      const res = await milestoneService.submitScore({
        campaignId: "camp-1",
        index: 0,
        score: 30,
        nonce: 1,
      });

      expect(prisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "REJECTED", aiScore: 30 }),
        })
      );
      expect(res.decision).toBe("REJECTED");
    });
  });

  describe("releaseAdvance", () => {
    it("should release advance successfully", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1" });
      contractService.releaseAdvance.mockResolvedValue({ txHash: "0xRelAdvHash" });
      prisma.campaign.update.mockResolvedValue({});

      const res = await milestoneService.releaseAdvance("camp-1");

      expect(contractService.releaseAdvance).toHaveBeenCalledWith("chain-1");
      expect(prisma.campaign.update).toHaveBeenCalled();
      expect(res.txHash).toBe("0xRelAdvHash");
    });
  });

  describe("release", () => {
    it("should release milestone successfully", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "camp-1", onChainId: "chain-1" });
      contractService.releaseMilestone.mockResolvedValue({ txHash: "0xRelHash" });
      prisma.milestone.update.mockResolvedValue({ status: "RELEASED" });

      const res = await milestoneService.release({ campaignId: "camp-1", index: 1 });

      expect(contractService.releaseMilestone).toHaveBeenCalledWith("chain-1");
      expect(prisma.milestone.update).toHaveBeenCalled();
      expect(res.txHash).toBe("0xRelHash");
    });
  });
});
