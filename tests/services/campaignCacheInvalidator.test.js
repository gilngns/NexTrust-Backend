import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/cache.js", () => ({
  invalidate: jest.fn(),
}));

const { invalidate } = await import("../../src/config/cache.js");
const { invalidateCampaignList, invalidateCampaign } = await import(
  "../../src/services/campaignCacheInvalidator.js"
);

describe("campaignCacheInvalidator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("invalidateCampaignList", () => {
    it("should invalidate the campaigns:list cache key", () => {
      invalidateCampaignList();

      expect(invalidate).toHaveBeenCalledWith("campaigns:list");
      expect(invalidate).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalidateCampaign", () => {
    it("should invalidate the specific campaign detail cache", () => {
      invalidateCampaign("camp-123");

      expect(invalidate).toHaveBeenCalledWith("campaigns:detail:camp-123");
    });

    it("should also invalidate the campaign list cache", () => {
      invalidateCampaign("camp-456");

      expect(invalidate).toHaveBeenCalledWith("campaigns:list");
    });

    it("should call invalidate exactly 2 times (detail + list)", () => {
      invalidateCampaign("camp-789");

      expect(invalidate).toHaveBeenCalledTimes(2);
    });
  });
});
