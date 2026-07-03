import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    name: z.string().min(2, "Nama minimal 2 karakter"),
    role: z.enum(["FOUNDATION", "PEMDA", "ADMIN", "DONOR"]),
    bankName: z.string().optional(),
    bankAccountNo: z.string().optional(),
    bankHolder: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(1, "Password tidak boleh kosong"),
  }),
});
