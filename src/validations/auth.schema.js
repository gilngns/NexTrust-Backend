import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    name: z.string().min(2, "Nama minimal 2 karakter"),
    role: z.enum(["FOUNDATION", "DINSOS", "ADMIN", "DONOR"]),
    bankName: z.string().optional(),
    bankAccountNo: z.string().optional(),
    bankHolder: z.string().optional(),
    skKemenkumham: z.string().optional(),
    izinPub: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(1, "Password tidak boleh kosong"),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Nama minimal 2 karakter").optional(),
    bankName: z.string().min(1, "Nama bank tidak boleh kosong").optional(),
    bankAccountNo: z.string().min(1, "Nomor rekening tidak boleh kosong").optional(),
    bankHolder: z.string().min(1, "Nama pemilik rekening tidak boleh kosong").optional(),
  }),
});

// ─── Donor (Mobile) ────────────────────────────────────────────────────────

export const donorRegisterSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, "Nama minimal 2 karakter"),
      email: z.string().email("Format email tidak valid"),
      dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir harus YYYY-MM-DD")
        .refine((val) => !isNaN(Date.parse(val)), "Tanggal lahir tidak valid"),
      phoneNumber: z
        .string()
        .min(9, "Nomor telepon minimal 9 digit")
        .max(12, "Nomor telepon maksimal 12 digit")
        .regex(/^(\+62|62|0)[0-9]+$/, "Format nomor telepon tidak valid (contoh: 08123456789 atau +6281234567890)"),
      password: z.string().min(6, "Password minimal 6 karakter"),
      confirmPassword: z.string().min(1, "Konfirmasi password tidak boleh kosong"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Password dan konfirmasi password tidak cocok",
      path: ["confirmPassword"],
    }),
});

export const donorLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(1, "Password tidak boleh kosong"),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token tidak boleh kosong"),
  }),
});