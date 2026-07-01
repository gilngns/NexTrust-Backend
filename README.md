# 🌟 NexTrust Backend API

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Polygon](https://img.shields.io/badge/Polygon-8247E5?style=for-the-badge&logo=polygon&logoColor=white)

**NexTrust Backend** adalah sistem *relayer* mutakhir yang menjembatani transaksi Web2 (QRIS Midtrans) dengan ekosistem Web3 (Smart Contract `TrustFundEscrow` di jaringan Polygon Amoy). Sistem ini menggunakan mekanisme *Custodial Wallet* tersentralisasi, sehingga donatur dan yayasan tidak perlu berurusan dengan kerumitan *crypto wallet* (Metamask, dsb).

Kebenaran mutlak aliran dana selalu disimpan secara transparan di *On-Chain* (Smart Contract), sedangkan database (PostgreSQL) hanya berfungsi sebagai *caching* metadata dan status demi kecepatan performa.

---

## 🚀 Fitur Utama (Core Features)

- **🌉 Web2 to Web3 Bridge:** Terintegrasi langsung dengan Midtrans (QRIS). Setiap donasi Rupiah akan otomatis di-*minting* menjadi token `MockXIDR` dan didepositkan ke Smart Contract Escrow.
- **🛡️ Enterprise-Grade Security:** 
  - **Zod Validation:** Skema validasi ketat untuk anti-injeksi dan memastikan integritas payload.
  - **Security Middlewares:** Dilengkapi dengan `Helmet` (HTTP Security Headers), `CORS`, dan `Express Rate Limit` (Anti DDoS/Brute Force).
  - **Anti-Leak Error Handler:** Mencegah kebocoran *stack-trace* atau skema database ke klien.
- **🤖 AI Oracle Integrations:** Mengotentikasi skor kewajaran RAB dan persentase penyelesaian *milestone* dari AI Evaluator.
- **📚 Interactive API Docs:** Dilengkapi dokumentasi interaktif (Swagger UI) yang mengikuti standar OpenAPI 3.0.

---

## 🏗️ Arsitektur (Clean Architecture)

Proyek ini telah melalui proses *Refactoring* ekstensif dan menerapkan pola *Separation of Concerns* untuk mempermudah skalabilitas tim:

```text
src/
├── app.js                   # Jantung konfigurasi Express (Middleware, Security, dll)
├── server.js                # Entry point murni untuk menghidupkan server
├── config/                  # Konfigurasi Prisma, Swagger, & variabel ENV
├── controllers/             # Lapisan pengendali logika HTTP (Req/Res)
├── middleware/              # Global Error Handler, Auth Guard, & Zod Validator
├── routes/                  # Pemetaan rute API pusat (Buku Menu)
├── services/                # Lapisan inti: Logika Bisnis & Interaksi Smart Contract
└── validations/             # Skema validasi input Zod
```

---

## ⚙️ Persiapan & Instalasi (Getting Started)

### 1. Kebutuhan Sistem
- Node.js (v18 atau lebih baru)
- PostgreSQL Database
- Akun Midtrans (Sandbox)
- Saldo POL / MATIC (Testnet) untuk dompet relayer backend.

### 2. Instalasi
```bash
# Clone repositori
git clone https://github.com/gilngns/NexTrust-Backend.git
cd NexTrust-Backend

# Install dependensi
npm install

# Setup Variabel Lingkungan
cp .env.example .env
# Wajib isi: DATABASE_URL, BACKEND_PRIVATE_KEY, MIDTRANS_SERVER_KEY
```

### 3. Migrasi Database (Prisma)
```bash
# Sinkronisasi skema ke database & generate Client
npm run prisma:generate
npm run prisma:migrate
```

### 4. Menjalankan Server
```bash
# Mode pengembangan (Auto-reload)
npm run dev

# Mode produksi
npm start
```

---

## 📖 Dokumentasi API (Swagger)

Saat server berjalan, Anda dapat menjelajahi dan menguji seluruh endpoints API secara visual melalui **Swagger UI**:

👉 **`http://localhost:3000/api-docs`**

Swagger secara otomatis merangkum spesifikasi lengkap untuk:
- Auth (`/api/auth/*`)
- Campaigns (`/api/campaigns/*`)
- RAB (`/api/rab/*`)
- Payouts (`/api/payouts/*`)
- Webhooks (`/api/webhook/midtrans`)

---

## 🔗 Integrasi Midtrans (Webhook)

Agar Midtrans dapat mengabari backend saat ada donasi yang berhasil dibayar, Anda harus menyetel **Notification URL** di dashboard Midtrans (Settings → Configuration) ke:
```text
https://<domain-backend-anda>/api/webhook/midtrans
```
*(Catatan: Saat pengembangan lokal, gunakan tunnel seperti **Ngrok** atau **Localtunnel** agar localhost Anda dapat dijangkau oleh Midtrans).*

---
*Dikembangkan dengan ❤️ untuk transparansi donasi masa depan.*
