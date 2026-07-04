import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    rabCheck: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const prisma = (await import("../../src/config/prisma.js")).default;
const rabService = (await import("../../src/services/rabService.js")).default;

describe("rabService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe("check", () => {
    it("should evaluate RAB and store the result", async () => {
      const items = [{ name: "Semen", qty: 10, unitPrice: 50000 }];
      
      prisma.rabCheck.create.mockResolvedValue({
        id: "rab-1",
        items: JSON.stringify(items),
        totalAmount: BigInt(500000),
        targetAmount: BigInt(600000),
        score: 100,
        reasonable: true,
      });

      const res = await rabService.check({ items, targetAmount: 600000, campaignDraftId: "draft-1" });

      expect(prisma.rabCheck.create).toHaveBeenCalled();
      expect(res.id).toBe("rab-1");
      expect(res.score).toBe(100);
      expect(res.reasonable).toBe(true);
      expect(res.total).toBe(500000);
    });

    it("should throw badRequest if items array is empty", async () => {
      await expect(rabService.check({ items: [] })).rejects.toThrow("Bad Request");
    });
  });

  describe("getById", () => {
    it("should retrieve and deserialize RAB check", async () => {
      prisma.rabCheck.findUnique.mockResolvedValue({
        id: "rab-1",
        items: JSON.stringify([{ name: "Pasir" }]),
        totalAmount: BigInt(100000),
        targetAmount: BigInt(200000),
      });

      const res = await rabService.getById("rab-1");
      
      expect(prisma.rabCheck.findUnique).toHaveBeenCalledWith({ where: { id: "rab-1" } });
      expect(res.items).toEqual([{ name: "Pasir" }]);
      expect(res.totalAmount).toBe("100000");
    });
  });
});
