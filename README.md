# NexTrust Backend

Backend relayer NexTrust — menjembatani QRIS (Midtrans), AI evaluator, dan smart contract `TrustFundEscrow` di Polygon Amoy. Custodial: pengguna tak pernah menyentuh wallet.

## Arsitektur

- **Express** — REST API
- **Prisma + PostgreSQL** — data off-chain (yayasan, campaign, donasi, milestone)
- **ethers.js** — semua transaksi on-chain (wallet backend = BACKEND_ROLE)
- **Midtrans** — QRIS (sandbox)
- **JWT + bcrypt** — auth berbasis peran (ADMIN / FOUNDATION / PEMDA)

Kebenaran dana selalu on-chain; DB hanya menyimpan metadata & status.

## Setup

```bash
npm install
cp .env.example .env         # isi nilainya
npm run prisma:generate      # generate Prisma client
npm run prisma:migrate       # buat tabel di database
npm run dev                  # jalankan server
```

Wajib diisi di `.env`: `DATABASE_URL`, `BACKEND_PRIVATE_KEY`, `MIDTRANS_SERVER_KEY`.
`ESCROW_ADDRESS` & `XIDR_ADDRESS` sudah diisi default (Amoy).

## Alur Sistem

```
Donor (Flutter) --donate--> QRIS Midtrans --webhook--> backend
  --mint MockXIDR--> depositXIDR --> dana KUNCI di escrow

Yayasan --submit bukti--> submitMilestone
AI (Favian) --skor--> oracleCallback --> VALIDATED
Admin --> releaseAdvance / releaseMilestone --> dana CAIR ke beneficiary
Pemda --> resolveFrozen (approve/reject) bila dibekukan
```

## Endpoint

### Auth
| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/auth/register` | Daftar (FOUNDATION/PEMDA/ADMIN) |
| POST | `/api/auth/login` | Login → JWT |

### Campaign
| Method | Path | Akses | Fungsi |
|--------|------|-------|--------|
| GET | `/api/campaigns` | publik | Daftar campaign |
| GET | `/api/campaigns/:id` | publik | Detail + status on-chain |
| POST | `/api/campaigns` | FOUNDATION/ADMIN | Buat campaign (DB + on-chain) |

### Donasi
| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/campaigns/:id/donate` | Mulai donasi → QRIS |
| GET | `/api/campaigns/:id/donations` | Daftar donasi |
| POST | `/api/webhook/midtrans` | Webhook Midtrans → mint+deposit |

### Milestone
| Method | Path | Akses | Fungsi |
|--------|------|-------|--------|
| POST | `/api/campaigns/:id/milestones/:i/submit` | FOUNDATION | Submit bukti |
| POST | `/api/campaigns/:id/milestones/:i/score` | AI | Kirim skor → oracleCallback |
| POST | `/api/campaigns/:id/release-advance` | ADMIN/FOUNDATION | Cairkan advance |
| POST | `/api/campaigns/:id/milestones/:i/release` | ADMIN/FOUNDATION | Cairkan milestone |

### Pemda
| Method | Path | Akses | Fungsi |
|--------|------|-------|--------|
| POST | `/api/campaigns/:id/resolve` | PEMDA/ADMIN | Approve/reject campaign frozen |

## Konfigurasi Midtrans

Set **Notification URL** di dashboard Midtrans (Settings → Configuration) ke:
`https://<domain-backend>/api/webhook/midtrans`

Saat lokal, pakai tunneling (ngrok) agar Midtrans bisa menjangkau webhook.

## Struktur

```
prisma/schema.prisma        # model data
src/
  config/                   # env + prisma client
  middleware/auth.js        # JWT + role guard
  services/
    contractService.js      # panggilan on-chain
    oracleService.js        # tanda tangan skor AI
    tokenService.js         # MockXIDR mint/approve
    midtransService.js      # QRIS + verifikasi webhook
    authService.js          # register/login JWT
    campaignService.js      # orkestrasi campaign (DB+chain)
    donationService.js      # donasi → QRIS → deposit
    milestoneService.js     # submit → skor → release
  routes/                   # auth, campaigns, webhook
  scripts/                  # utilitas cek koneksi & demo
  server.js
```
