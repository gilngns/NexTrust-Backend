/**
 * Toleransi selisih nominal realisasi vs RAB milestone.
 * Implementasi tabel md §8.1 (Toleransi & Fallback Tahap 3).
 *
 * Aturan emas: sistem otomatis hanya untuk kasus sangat jelas; yang meragukan
 * NAIK ke Dinsos (review), bukan ditolak mentah. Ini menjawab pertanyaan juri
 * soal false positive.
 *
 * Verdict:
 *   "PASS"    -> selisih dalam toleransi, lolos otomatis
 *   "REVIEW"  -> abu-abu, wajib review Dinsos
 *   "HOLD"    -> di luar batas, ditahan + wajib penjelasan
 */

// Ambang default (titik awal masuk akal — boleh disesuaikan, yang penting eksplisit).
export const TOLERANCE = {
  PASS_MAX: 0.1, // |selisih| <= 10% -> lolos
  REVIEW_MAX: 0.25, // 10% < |selisih| <= 25% -> review
  // Asimetri: realisasi lebih MURAH lebih ditoleransi (hemat = baik,
  // mark-up = red flag). Batas review untuk sisi "lebih murah" dilonggarkan.
  CHEAPER_REVIEW_MAX: 0.35,
};

/**
 * @param {number} planned   Nominal rencana (RAB milestone), > 0
 * @param {number} actual    Nominal realisasi (total nota tervalidasi), >= 0
 * @returns {{ verdict: "PASS"|"REVIEW"|"HOLD", ratio: number, direction: "under"|"over"|"exact", surplus: number, notes: string }}
 */
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

  const diff = a - p; // positif = lebih mahal, negatif = lebih murah
  const ratio = Math.abs(diff) / p;
  const direction = diff > 0 ? "over" : diff < 0 ? "under" : "exact";

  // Sisa dana (rencana - realisasi) saat lebih murah tetap di escrow,
  // dialihkan ke milestone lain / refund proporsional.
  const surplus = diff < 0 ? -diff : 0;

  // Batas review efektif: lebih longgar bila realisasi lebih murah.
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

/**
 * Kelengkapan nota per item (md §8.1):
 *   - Nota item BESAR (>30% nilai milestone) hilang -> HOLD (wajib nota/review)
 *   - Nota item KECIL (<=15% nilai milestone) hilang -> PASS (ganti surat pernyataan + foto)
 *   - Di antaranya -> REVIEW
 *
 * @param {number} milestoneValue  Total nilai milestone, > 0
 * @param {Array<{name?: string, value: number, hasReceipt: boolean}>} items
 * @returns {{ verdict: "PASS"|"REVIEW"|"HOLD", missing: Array, notes: string }}
 */
export function evaluateReceiptCompleteness(milestoneValue, items = []) {
  const total = Number(milestoneValue);
  if (!Number.isFinite(total) || total <= 0) {
    return {
      verdict: "HOLD",
      missing: [],
      notes: "Nilai milestone tidak valid.",
    };
  }

  const BIG = 0.3; // >30% nilai milestone = item besar
  const SMALL = 0.15; // <=15% nilai milestone = item kecil

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
    // share <= SMALL: masih boleh PASS (ganti surat pernyataan + foto)
  }

  const notes =
    verdict === "PASS"
      ? "Kelengkapan nota memadai (item hilang hanya bernilai kecil)."
      : verdict === "REVIEW"
        ? "Ada nota item menengah yang hilang. Naik review Dinsos."
        : "Nota item besar (>30% nilai milestone) hilang. Wajib nota / review.";

  return { verdict, missing, notes };
}

/**
 * Gabungkan verdict — ambil yang paling ketat (HOLD > REVIEW > PASS).
 */
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
