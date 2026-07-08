import { z } from "zod";

export const createCampaignSchema = z.object({
  body: z
    .object({
      title: z.string().min(5, "Judul minimal 5 karakter"),
      description: z.string().min(10, "Deskripsi minimal 10 karakter"),
      targetAmount: z.number().positive("Target harus lebih besar dari 0"),
      durationDays: z.number().int().positive("Durasi hari harus positif").optional(),
      category: z.enum(["PEMBANGUNAN", "PENGADAAN_BARANG", "ALAT_KESEHATAN", "REKONSTRUKSI"]),
      onChainId: z.string(),
      advanceAmount: z.number().positive(),
      milestoneAmount: z.number().min(0).optional(),
      totalMilestones: z
        .number()
        .int()
        .min(2, "Minimal 2 milestone")
        .max(6, "Maksimal 6 milestone"),
      rabCID: z.string().optional(),
      izinPub: z.string().min(1, "Surat izin PUB wajib diisi"),
      imageUrl: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      aiScore: z.number().optional(),
      aiNotes: z.string().optional(),
      rabData: z.any().optional(),
    })
    .refine((b) => b.advanceAmount <= b.targetAmount * 0.15, {
      message: "DP (advanceAmount) maksimal 15% dari target",
      path: ["advanceAmount"],
    }),
});

export const donateSchema = z.object({
  body: z.object({
    donorName: z
      .string()
      .min(2, "Nama donatur minimal 2 karakter")
      .optional()
      .default("Anonim"),
    amount: z.number().positive("Jumlah donasi harus lebih besar dari 0"),
  }),
});

export const submitMilestoneSchema = z.object({
  body: z.object({
    proofUrl: z.string().url("Format URL bukti tidak valid").optional(),
    description: z.string().min(5, "Deskripsi minimal 5 karakter"),
    evidenceCID: z.string().optional(),
    title: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
});

export const scoreMilestoneSchema = z.object({
  body: z.object({
    score: z.number().int().min(0).max(100, "Skor harus antara 0-100"),
    nonce: z.number().int(),
  }),
});

export const resolveFrozenSchema = z.object({
  body: z.object({
    approve: z.boolean({
      required_error: "Parameter approve harus ada (boolean)",
    }),
  }),
});

export const updateImageSchema = z.object({
  body: z.object({
    imageUrl: z.string().min(1, "URL gambar tidak boleh kosong"),
  }),
});
