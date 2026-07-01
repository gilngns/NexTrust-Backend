const prisma = require("../config/prisma");

/**
 * RabService — pengecekan kewajaran RAB (Rencana Anggaran Biaya).
 *
 * Backend berperan sebagai pipa + gerbang:
 *  1. terima & simpan RAB
 *  2. kirim ke AI evaluator (di sini MOCK; diganti API AI Favian nanti)
 *  3. simpan hasil verdict
 *  4. verdict dipakai sebagai gerbang sebelum campaign dibuat on-chain
 *
 * MOCK saat ini: menilai kewajaran secara sederhana dari total item vs target.
 * Ganti `evaluateWithAI` dengan pemanggilan API AI Favian saat sudah siap.
 */
class RabService {
  /**
   * Evaluasi RAB. items = [{ name, qty, unitPrice }], targetAmount = angka target.
   * Mengembalikan verdict + skor + catatan, lalu disimpan.
   */
  async check({ campaignDraftId, items, targetAmount }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("RAB harus berisi minimal satu item");
    }

    const total = items.reduce(
      (sum, it) => sum + Number(it.qty) * Number(it.unitPrice),
      0
    );

    const verdict = await this.evaluateWithAI({ items, total, targetAmount });
    const record = await prisma.rabCheck.create({
      data: {
        campaignDraftId: campaignDraftId || null,
        items: JSON.stringify(items),
        totalAmount: BigInt(Math.round(total)),
        targetAmount: BigInt(Math.round(Number(targetAmount || 0))),
        score: verdict.score,
        reasonable: verdict.reasonable,
        notes: verdict.notes,
      },
    });

    return {
      id: record.id,
      total,
      ...verdict,
    };
  }

  /**
   * MOCK AI evaluator. GANTI dengan panggilan API AI Favian.
   * Aturan mock sederhana:
   *  - total melebihi target > 10%  -> tidak wajar (over budget)
   *  - ada item dengan harga satuan ekstrem (0 atau sangat besar) -> flag
   *  - selain itu -> wajar
   */
  async evaluateWithAI({ items, total, targetAmount }) {
    const target = Number(targetAmount || 0);
    const notes = [];
    let score = 100;

    if (target > 0 && total > target * 1.1) {
      score -= 40;
      notes.push(
        `Total RAB (${total}) melebihi target (${target}) lebih dari 10%.`
      );
    }
    if (target > 0 && total < target * 0.5) {
      score -= 15;
      notes.push(
        `Total RAB (${total}) jauh di bawah target — rincian mungkin kurang lengkap.`
      );
    }
    for (const it of items) {
      const price = Number(it.unitPrice);
      if (!price || price <= 0) {
        score -= 20;
        notes.push(`Item "${it.name}" memiliki harga satuan tidak valid.`);
      }
    }

    if (score < 0) score = 0;
    const reasonable = score >= 60;

    return {
      score,
      reasonable,
      notes: notes.length ? notes.join(" ") : "RAB tampak wajar.",
      source: "MOCK",
    };
  }

  async getById(id) {
    const rec = await prisma.rabCheck.findUnique({ where: { id } });
    if (!rec) throw new Error("RAB check tidak ditemukan");
    return {
      ...rec,
      items: JSON.parse(rec.items),
      totalAmount: rec.totalAmount.toString(),
      targetAmount: rec.targetAmount.toString(),
    };
  }
}

module.exports = new RabService();