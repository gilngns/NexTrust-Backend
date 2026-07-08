import { z } from "zod";

export const checkRabSchema = z.object({
  body: z.object({
    campaignDraftId: z.string().nullable().optional(),
    targetAmount: z.number().positive("Target harus lebih besar dari 0"),
    items: z
      .array(
        z.object({
          name: z.string().min(2, "Nama item minimal 2 karakter"),
          qty: z.number().positive("Kuantitas harus lebih besar dari 0"),
          unit: z.string().min(1, "Satuan wajib diisi"),
          unitPrice: z.number().min(0, "Harga satuan tidak boleh negatif"),
        }),
      )
      .min(1, "RAB harus memiliki setidaknya 1 item"),
  }),
});
