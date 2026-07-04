export function progressiveRetentionSplit(milestoneTotal, count) {
  const total = BigInt(milestoneTotal);
  const n = Number(count);

  if (n < 2 || n > 6) {
    throw new Error("totalMilestones harus 2-6");
  }
  if (total <= 0n) {
    throw new Error("milestoneTotal harus > 0");
  }

  let weights;
  if (n === 2) {
    weights = [40n, 60n];
  } else {
    weights = Array.from({ length: n }, (_, i) => BigInt(i + 1));
  }

  const weightSum = weights.reduce((a, b) => a + b, 0n);

  const parts = weights.map((w) => (total * w) / weightSum);

  const distributed = parts.reduce((a, b) => a + b, 0n);
  parts[parts.length - 1] += total - distributed;

  return parts;
}

export default { progressiveRetentionSplit };
