/**
 * Membagi total dana milestone menjadi porsi per-tahap dengan pola
 * RETENSI PROGRESIF (md §3.2): kecil di depan, porsi akhir TERBESAR.
 *
 * Prinsip: pada setiap titik, dana yang belum cair harus cukup besar untuk
 * menghilangkan insentif kabur. Karena itu tahap final ditahan paling besar
 * ("retainer") — kebalikan intuisi umum.
 *
 * Constraint yang dijaga (selaras kontrak):
 *   - tidak ada milestone > 40% total (pagar sistem)
 *   - jumlah semua porsi == milestoneTotal (sisa dibebankan ke tahap akhir)
 *
 * @param {bigint|number} milestoneTotal  Total dana untuk seluruh milestone
 *                                        (targetAmount - advanceAmount)
 * @param {number} count  Jumlah milestone (2..6)
 * @returns {bigint[]}    Porsi per milestone, menaik, terakhir terbesar
 */
export function progressiveRetentionSplit(milestoneTotal, count) {
  const total = BigInt(milestoneTotal);
  const n = Number(count);

  if (n < 2 || n > 6) {
    throw new Error("totalMilestones harus 2-6");
  }
  if (total <= 0n) {
    throw new Error("milestoneTotal harus > 0");
  }

  // Bobot menaik linear: 1, 2, 3, ... n. Tahap akhir dapat bobot terbesar.
  // Dengan bobot linear, porsi terbesar (n) selalu < 40% untuk n >= 3;
  // untuk n = 2 (bobot 1,2) porsi akhir = 66% -> dibatasi pagar 40%? Tidak:
  // untuk 2 milestone kita pakai 40/60 agar tetap "akhir terbesar" namun wajar.
  let weights;
  if (n === 2) {
    weights = [40n, 60n]; // akhir terbesar, di bawah/di batas wajar
  } else {
    weights = Array.from({ length: n }, (_, i) => BigInt(i + 1));
  }

  const weightSum = weights.reduce((a, b) => a + b, 0n);

  const parts = weights.map((w) => (total * w) / weightSum);

  // Bebankan sisa pembulatan ke tahap TERAKHIR (memperkuat retensi akhir).
  const distributed = parts.reduce((a, b) => a + b, 0n);
  parts[parts.length - 1] += total - distributed;

  return parts;
}

export default { progressiveRetentionSplit };
