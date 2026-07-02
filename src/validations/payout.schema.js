import { z } from 'zod';

export const requestPayoutSchema = z.object({
  body: z.object({
    amount: z.number().positive("Jumlah pencairan harus lebih besar dari 0"),
  }),
});
