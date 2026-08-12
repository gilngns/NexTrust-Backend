import { jest } from "@jest/globals";

jest.unstable_mockModule("ethers", () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    Wallet: jest.fn().mockImplementation(() => ({
      address: "0xBackendWallet",
    })),
    Contract: jest.fn().mockImplementation(() => ({
      decimals: jest.fn().mockResolvedValue(6),
      owner: jest.fn().mockResolvedValue("0xBackendWallet"),
      balanceOf: jest.fn().mockResolvedValue(BigInt(0)),
      allowance: jest.fn().mockResolvedValue(BigInt(0)),
      mint: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: "0xMintHash" })
      }),
      approve: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: "0xApproveHash" })
      }),
    })),
    parseUnits: jest.fn().mockReturnValue(BigInt(100000000)),
    MaxUint256: BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935"),
  },
}));

const { ethers } = await import("ethers");
const tokenService = (await import("../../src/services/tokenService.js")).default;

describe("tokenService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("toUnits", () => {
    it("should convert human amount to units based on decimals", async () => {
      const res = await tokenService.toUnits(100);
      expect(res).toBe(BigInt(100000000));
    });
  });

  describe("owner and backendIsOwner", () => {
    it("should return owner address", async () => {
      const res = await tokenService.owner();
      expect(res).toBe("0xBackendWallet");
    });

    it("should return true if backend is owner", async () => {
      const res = await tokenService.backendIsOwner();
      expect(res).toBe(true);
    });
  });

  describe("balanceOf", () => {
    it("should return balance of an address", async () => {
      const res = await tokenService.balanceOf("0xUser");
      expect(res).toBe("0");
    });
  });

  describe("mint", () => {
    it("should mint tokens to address if balance is low", async () => {
      const res = await tokenService.mint("0xUser", 100);
      expect(res.txHash).toBe("0xMintHash");
      
      expect(res.amount).toBe("200000000");
    });
  });

  describe("approveEscrow", () => {
    it("should approve escrow contract to spend tokens with MaxUint256", async () => {
      const res = await tokenService.approveEscrow(100);
      expect(res.txHash).toBe("0xApproveHash");
      expect(res.amount).toBe(ethers.MaxUint256.toString());
    });
  });
});
