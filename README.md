<div align="center">

# NEXTRUST HYBRID RELAYER 

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-1A1A1A?style=for-the-badge&logo=node.js&logoColor=68A063" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-1A1A1A?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-1A1A1A?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Polygon_Amoy-1A1A1A?style=for-the-badge&logo=polygon&logoColor=8247E5" alt="Polygon" />
</p>

**Bridging Fiat Web2 to Trustless Web3 Escrow**

</div>

---

<br/>

## <img src="https://cdn.simpleicons.org/web3dotjs/black" width="24" /> THE INFRASTRUCTURE

**NexTrust Backend** beroperasi sebagai *hybrid relayer* tingkat lanjut. Sistem ini memecahkan masalah adopsi Web3 dengan cara menyerap transaksi mata uang fiat dari Web2 (QRIS Midtrans), lalu mengonversinya menjadi representasi nilai *On-Chain* (MockXIDR) yang dikunci ke dalam **TrustFundEscrow Smart Contract** di jaringan Polygon. 

Dengan arsitektur *Custodial Wallet* tersentralisasi, donatur dan yayasan mendapatkan pengalaman mulus layaknya aplikasi Web2, sementara kebenaran dan keamanan dana dijamin sepenuhnya oleh desentralisasi Web3.

<br/>

## <img src="https://cdn.simpleicons.org/ethereum/black" width="24" /> PROTOCOL CAPABILITIES

* <img src="https://cdn.simpleicons.org/cashapp/black" width="16" /> **Fiat to Crypto Bridge**
  Mendengarkan *webhook* secara *real-time* dari Midtrans dan secara otomatis melakukan *minting* MockXIDR ke *Smart Contract* untuk donasi yang berhasil.

* <img src="https://cdn.simpleicons.org/auth0/black" width="16" /> **Enterprise Security Matrix**
  Dilengkapi pertahanan berlapis: **Zod** untuk validasi skema input (Anti-Injection), **Helmet** untuk perlindungan *header* otomatis, serta **Express Rate Limiter** anti DDoS. Pesan *error* internal diisolasi total agar tidak bocor.

* <img src="https://cdn.simpleicons.org/openai/black" width="16" /> **AI Oracle Authorization**
  Menyediakan endpoint khusus (terlindungi) untuk *AI Evaluator* yang mengirim skor kewajaran RAB dan verifikasi kemajuan *milestone* secara *On-Chain*.

* <img src="https://cdn.simpleicons.org/swagger/black" width="16" /> **OpenAPI 3.0 Standard**
  Spesifikasi kontrak API interaktif tersedia sepenuhnya melalui Swagger UI untuk integrasi *frontend* yang presisi.

<br/>

## <img src="https://cdn.simpleicons.org/codemagic/black" width="24" /> SYSTEM ARCHITECTURE

Dirancang dengan pola *Clean Architecture* modern untuk menjaga integritas *codebase*:

```text
src/
├── app.js                   [ Core Express Engine & Security Middleware ]
├── server.js                [ Node.js Entry Point ]
├── config/                  [ Environment Variables & Client Configurations ]
├── controllers/             [ HTTP Request/Response Handlers ]
├── middleware/              [ Role Guards, Global Error Traps, Zod Validators ]
├── routes/                  [ Centralized API Endpoints ]
├── services/                [ Business Logic & Smart Contract Signers ]
└── validations/             [ Zod Schema Definitions ]
```

<br/>

## <img src="https://cdn.simpleicons.org/gnometerminal/black" width="24" /> DEPLOYMENT SEQUENCE

**1. Prerequisites**
Node.js v18+, PostgreSQL, kredensial Midtrans Server Key, serta *Private Key* dompet relayer yang telah didanai (POL Testnet).

**2. Bootstrapping**
```bash
git clone https://github.com/gilngns/NexTrust-Backend.git
cd NexTrust-Backend
npm install
cp .env.example .env
```

**3. Database Sync**
```bash
npm run prisma:generate
npm run prisma:migrate
```

**4. Ignition**
```bash
npm run dev     # Development (Watch Mode)
npm start       # Production
```

<br/>

## <img src="https://cdn.simpleicons.org/read-the-docs/black" width="24" /> DEVELOPER CONSOLE

Saat node berjalan, akses konsol dokumentasi interaktif untuk simulasi API:
**`http://localhost:3000/api-docs`**

<br/>

## <img src="https://cdn.simpleicons.org/ngrok/black" width="24" /> MIDTRANS LISTENER

Untuk mengaktifkan relayer otomatis, konfigurasikan **Notification URL** pada *dashboard* Midtrans (Settings → Configuration) ke proksi berikut:
```text
https://<domain-backend>/api/webhook/midtrans
```
*(Gunakan tunnel seperti Localtunnel atau Ngrok pada saat fase pengembangan lokal).*

<br/>
<div align="center">
  <small>Decentralized Trust. Centralized Convenience.</small>
</div>
