import { jest } from "@jest/globals";

const walletService = (await import("../../src/services/walletService.js")).default;
const { ethers } = await import("ethers");

describe("walletService", () => {
  describe("generate and getSigner", () => {
    it("should generate a wallet and return address and encryptedKey", async () => {
      const result = await walletService.generate();

            expect(result).toHaveProperty("address");
      expect(result).toHaveProperty("encryptedKey");
      expect(ethers.isAddress(result.address)).toBe(true);
      expect(result.encryptedKey).toMatch(/.+:.+:.+/); 
    });

    it("should get a signer from the encryptedKey", async () => {
      const generated = await walletService.generate();

            const signer = await walletService.getSigner(generated.encryptedKey, null);

            expect(signer).toBeInstanceOf(ethers.Wallet);
      expect(signer.address).toBe(generated.address);
    });
  });
});
