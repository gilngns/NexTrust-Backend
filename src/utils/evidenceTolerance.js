
export const TOLERANCE = {
  PASS_MAX: 0.1, 
  REVIEW_MAX: 0.25, 
  CHEAPER_REVIEW_MAX: 0.35,
};

export function evaluateNominalTolerance(planned, actual) {
  const p = Number(planned);
  const a = Number(actual);

  if (!Number.isFinite(p) || p <= 0) {
    return {
      verdict: "HOLD",
      ratio: NaN,
      direction: "exact",
      surplus: 0,
      notes: "Nominal rencana milestone tidak valid.",
    };
  }
  if (!Number.isFinite(a) || a < 0) {
    return {
      verdict: "HOLD",
      ratio: NaN,
      direction: "exact",
      surplus: 0,
      notes: "Nominal realisasi tidak valid.",
    };
  }

  const diff = a - p; 
  const ratio = Math.abs(diff) / p;
  const direction = diff > 0 ? "over" : diff < 0 ? "under" : "exact";

  const surplus = diff < 0 ? -diff : 0;

  const reviewMax =
    direction === "under" ? TOLERANCE.CHEAPER_REVIEW_MAX : TOLERANCE.REVIEW_MAX;

  let verdict;
  if (ratio <= TOLERANCE.PASS_MAX) {
    verdict = "PASS";
  } else if (ratio <= reviewMax) {
    verdict = "REVIEW";
  } else {
    verdict = "HOLD";
  }

  const pct = (ratio * 100).toFixed(1);
  let notes;
  if (verdict === "PASS") {
    notes = `Selisih ${pct}% dalam toleransi (≤10%). Lolos otomatis.`;
  } else if (verdict === "REVIEW") {
    notes =
      direction === "under"
        ? `Realisasi lebih murah ${pct}% (hemat). Naik review Dinsos.`
        : `Selisih ${pct}% (10–25%). Naik review Dinsos.`;
  } else {
    notes =
      direction === "over"
        ? `Realisasi lebih mahal ${pct}% (>25%). Ditahan, wajib penjelasan.`
        : `Selisih ${pct}% di luar batas. Ditahan, wajib penjelasan.`;
  }

  return { verdict, ratio, direction, surplus, notes };
}

export function evaluateReceiptCompleteness(milestoneValue, items = []) {
  const total = Number(milestoneValue);
  if (!Number.isFinite(total) || total <= 0) {
    return {
      verdict: "HOLD",
      missing: [],
      notes: "Nilai milestone tidak valid.",
    };
  }

  const BIG = 0.3; 
  const SMALL = 0.15; 

  const missing = items.filter((it) => !it.hasReceipt);
  let verdict = "PASS";

  for (const it of missing) {
    const share = Number(it.value) / total;
    if (share > BIG) {
      verdict = "HOLD";
      break;
    } else if (share > SMALL) {
      if (verdict !== "HOLD") verdict = "REVIEW";
    }
  }

  const notes =
    verdict === "PASS"
      ? "Kelengkapan nota memadai (item hilang hanya bernilai kecil)."
      : verdict === "REVIEW"
        ? "Ada nota item menengah yang hilang. Naik review Dinsos."
        : "Nota item besar (>30% nilai milestone) hilang. Wajib nota / review.";

  return { verdict, missing, notes };
}

export function combineVerdicts(...verdicts) {
  const rank = { PASS: 0, REVIEW: 1, HOLD: 2 };
  return verdicts.reduce(
    (worst, v) => (rank[v] > rank[worst] ? v : worst),
    "PASS",
  );
}

export default {
  TOLERANCE,
  evaluateNominalTolerance,
  evaluateReceiptCompleteness,
  combineVerdicts,
};
