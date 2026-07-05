import { jest } from "@jest/globals";
import crypto from "crypto";

jest.unstable_mockModule("../../src/config/index.js", () => ({
  default: {
    midtrans: {
      isProduction: false,
      serverKey: "server-key",
    },
  },
}));

const midtransService = (await import("../../src/services/midtransService.js")).default;
const config = (await import("../../src/config/index.js")).default;

global.fetch = jest.fn();

describe("midtransService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createQris", () => {
    it("should call midtrans Snap API and return qrisUrl (redirect_url)", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "snap-token-123",
          redirect_url: "http://snap.url/pay",
        }),
      });

      const res = await midtransService.createQris("order-1", 100000);

      expect(global.fetch).toHaveBeenCalled();
      expect(res.qrisUrl).toBe("http://snap.url/pay");
      expect(res.snapToken).toBe("snap-token-123");
    });

    it("should throw error if Snap request fails", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error_messages: ["Error message"] }),
      });

      await expect(midtransService.createQris("order-1", 100)).rejects.toThrow("Error message");
    });
  });

  describe("verifySignature", () => {
    it("should verify correct signature", async () => {
      const payload = {
        order_id: "order-1",
        status_code: "200",
        gross_amount: "10000.00",
        signature_key: crypto
          .createHash("sha512")
          .update("order-120010000.00" + config.midtrans.serverKey)
          .digest("hex"),
      };

      const isValid = await midtransService.verifySignature(payload);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", async () => {
      const payload = {
        order_id: "order-1",
        status_code: "200",
        gross_amount: "10000.00",
        signature_key: "invalid-sig",
      };

      const isValid = await midtransService.verifySignature(payload);
      expect(isValid).toBe(false);
    });
  });

  describe("interpretStatus", () => {
    it("should interpret settlement as PAID", async () => {
      const status = await midtransService.interpretStatus({ transaction_status: "settlement" });
      expect(status).toBe("PAID");
    });

    it("should interpret expire as EXPIRED", async () => {
      const status = await midtransService.interpretStatus({ transaction_status: "expire" });
      expect(status).toBe("EXPIRED");
    });
  });
});