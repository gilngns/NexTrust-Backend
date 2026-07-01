const { z } = require("zod");

const createCampaignSchema = z.object({
  body: z.object({
    title: z.string().min(5, "Judul minimal 5 karakter"),
    description: z.string().min(10, "Deskripsi minimal 10 karakter"),
    targetAmount: z.number().positive("Target harus lebih besar dari 0"),
    durationDays: z.number().int().positive("Durasi hari harus positif"),
  }),
});

const donateSchema = z.object({
  body: z.object({
    donorName: z.string().min(2, "Nama donatur minimal 2 karakter").optional().default("Anonim"),
    amount: z.number().positive("Jumlah donasi harus lebih besar dari 0"),
  }),
});

const submitMilestoneSchema = z.object({
  body: z.object({
    proofUrl: z.string().url("Format URL bukti tidak valid"),
    description: z.string().min(5, "Deskripsi minimal 5 karakter"),
  }),
});

const scoreMilestoneSchema = z.object({
  body: z.object({
    score: z.number().int().min(0).max(100, "Skor harus antara 0-100"),
    nonce: z.number().int(),
  }),
});

const resolveFrozenSchema = z.object({
  body: z.object({
    approve: z.boolean({ required_error: "Parameter approve harus ada (boolean)" }),
  }),
});

module.exports = {
  createCampaignSchema,
  donateSchema,
  submitMilestoneSchema,
  scoreMilestoneSchema,
  resolveFrozenSchema,
};
