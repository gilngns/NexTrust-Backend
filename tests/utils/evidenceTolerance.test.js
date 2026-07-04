import {
  evaluateNominalTolerance,
  evaluateReceiptCompleteness,
  combineVerdicts,
} from "../../src/utils/evidenceTolerance.js";

describe("evaluateNominalTolerance", () => {
  it("PASS when within 10%", () => {
    expect(evaluateNominalTolerance(100, 105).verdict).toBe("PASS");
    expect(evaluateNominalTolerance(100, 95).verdict).toBe("PASS");
  });

  it("REVIEW when 10-25% more expensive", () => {
    const r = evaluateNominalTolerance(100, 120);
    expect(r.verdict).toBe("REVIEW");
    expect(r.direction).toBe("over");
  });

  it("HOLD when >25% more expensive", () => {
    expect(evaluateNominalTolerance(100, 140).verdict).toBe("HOLD");
  });

  it("is more lenient when cheaper (asymmetry)", () => {
    const r = evaluateNominalTolerance(100, 70);
    expect(r.verdict).toBe("REVIEW");
    expect(r.direction).toBe("under");
    expect(r.surplus).toBe(30);
  });

  it("HOLD on invalid planned amount", () => {
    expect(evaluateNominalTolerance(0, 100).verdict).toBe("HOLD");
  });
});

describe("evaluateReceiptCompleteness", () => {
  it("PASS when only small items missing (<=15%)", () => {
    const r = evaluateReceiptCompleteness(1000, [
      { name: "a", value: 800, hasReceipt: true },
      { name: "b", value: 100, hasReceipt: false }, 
    ]);
    expect(r.verdict).toBe("PASS");
  });

  it("HOLD when a big item (>30%) is missing", () => {
    const r = evaluateReceiptCompleteness(1000, [
      { name: "a", value: 400, hasReceipt: false }, 
    ]);
    expect(r.verdict).toBe("HOLD");
  });

  it("REVIEW when a mid item (15-30%) is missing", () => {
    const r = evaluateReceiptCompleteness(1000, [
      { name: "a", value: 250, hasReceipt: false }, 
    ]);
    expect(r.verdict).toBe("REVIEW");
  });
});

describe("combineVerdicts", () => {
  it("returns the strictest", () => {
    expect(combineVerdicts("PASS", "REVIEW", "PASS")).toBe("REVIEW");
    expect(combineVerdicts("PASS", "REVIEW", "HOLD")).toBe("HOLD");
    expect(combineVerdicts("PASS", "PASS")).toBe("PASS");
  });
});
