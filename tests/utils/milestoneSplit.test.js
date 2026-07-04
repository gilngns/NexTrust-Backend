import { progressiveRetentionSplit } from "../../src/utils/milestoneSplit.js";

describe("progressiveRetentionSplit", () => {
  it("sums exactly to total (no dust lost)", () => {
    for (const n of [2, 3, 4, 5, 6]) {
      const total = 1_000_000n;
      const parts = progressiveRetentionSplit(total, n);
      expect(parts.length).toBe(n);
      expect(parts.reduce((a, b) => a + b, 0n)).toBe(total);
    }
  });

  it("last milestone is the largest (progressive retention)", () => {
    const parts = progressiveRetentionSplit(1_000_000n, 4);
    const last = parts[parts.length - 1];
    for (let i = 0; i < parts.length - 1; i++) {
      expect(last > parts[i]).toBe(true);
    }
  });

  it("is non-decreasing across stages for n>=3", () => {
    const parts = progressiveRetentionSplit(1_000_000n, 5);
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i] >= parts[i - 1]).toBe(true);
    }
  });

  it("uses 40/60 for 2 milestones", () => {
    const parts = progressiveRetentionSplit(1_000_000n, 2);
    expect(parts[0]).toBe(400_000n);
    expect(parts[1]).toBe(600_000n);
  });

  it("throws for out-of-range count", () => {
    expect(() => progressiveRetentionSplit(1000n, 1)).toThrow();
    expect(() => progressiveRetentionSplit(1000n, 7)).toThrow();
  });

  it("throws for non-positive total", () => {
    expect(() => progressiveRetentionSplit(0n, 3)).toThrow();
  });
});
