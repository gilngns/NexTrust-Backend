const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NexTrust Backend API",
      version: "0.3.0",
      description:
        "API backend NexTrust — platform crowdfunding donasi yayasan berbasis blockchain (full custodial). User tidak menyentuh wallet Web3. Semua respons berformat { ok: boolean, ... }.",
    },
    servers: [
      { url: "http://localhost:3000", description: "Local" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            error: { type: "string", example: "Pesan kesalahan" },
          },
        },
      },
    },
    tags: [
      { name: "Health", description: "Status koneksi" },
      { name: "Auth", description: "Registrasi & login" },
      { name: "Campaign", description: "Manajemen campaign donasi" },
      { name: "RAB", description: "Pengecekan kewajaran anggaran (AI)" },
      { name: "Donasi", description: "Donasi via QRIS" },
      { name: "Milestone", description: "Bukti, penilaian AI, pelepasan dana" },
      { name: "Payout", description: "Pencairan ke rekening bank" },
      { name: "Pemda", description: "Resolusi campaign beku" },
    ],
  },
  apis: [require('path').join(__dirname, '../routes/*.js').replace(/\\/g, '/')],
};

module.exports = swaggerJsdoc(options);