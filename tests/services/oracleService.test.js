import { jest } from "@jest/globals";

jest.unstable_mockModule("ethers", () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1337 })
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      address: "0xOracleWallet",
      signMessage: jest.fn().mockResolvedValue("0xSignature")
    })),
    Contract: jest.fn().mockImplementation(() => ({
      oracleCallback: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: "0xCallbackHash" })
      })
    })),
    id: jest.fn().mockReturnValue("0xHashedId"),
    solidityPackedKeccak256: jest.fn().mockReturnValue("0xMessageHash"),
    getBytes: jest.fn().mockReturnValue("bytes"),
  },
}));

const { ethers } = await import("ethers");
const oracleService = (await import("../../src/services/oracleService.js")).default;

describe("oracleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOracleAddress", () => {
    it("should return the oracle address", async () => {
      const addr = await oracleService.getOracleAddress();
      expect(addr).toBe("0xOracleWallet");
    });
  });

  describe("signScore", () => {
    it("should generate a valid signature for a score", async () => {
      const sig = await oracleService.signScore({ campaignId: "0xCamp", score: 90, nonce: 1 });
      expect(sig).toBe("0xSignature");
      expect(ethers.solidityPackedKeccak256).toHaveBeenCalled();
    });
  });

  describe("submitScore", () => {
    it("should submit score on-chain", async () => {
      const res = await oracleService.submitScore("camp-1", 90, 1);

            expect(ethers.id).toHaveBeenCalledWith("camp-1");
      expect(res.txHash).toBe("0xCallbackHash");
      expect(res.score).toBe(90);
    });
  });
});
