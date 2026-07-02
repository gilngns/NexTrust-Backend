import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

async function evaluateWithAI({ items, total, targetAmount }) {
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

async function check({ items, targetAmount, campaignDraftId }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.badRequest();
  }

  const total = items.reduce(
    (sum, it) => sum + Number(it.qty) * Number(it.unitPrice),
    0
  );

  const verdict = await evaluateWithAI({ items, total, targetAmount });
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

async function getById(id) {
  const rec = await prisma.rabCheck.findUnique({ where: { id } });
  if (!rec) throw AppError.notFound();
  return {
    ...rec,
    items: JSON.parse(rec.items),
    totalAmount: rec.totalAmount.toString(),
    targetAmount: rec.targetAmount.toString(),
  };
}

export default { check, evaluateWithAI, getById };
