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

## <img src="https://cdn.simpleicons.org/web3dotjs/white" width="24" /> THE INFRASTRUCTURE

**NexTrust Backend** operates as an advanced hybrid relayer. This system solves Web3 adoption hurdles by absorbing fiat transactions from Web2 (Midtrans QRIS) and converting them into an On-Chain representation (MockXIDR) securely locked within the **TrustFundEscrow Smart Contract** on the Polygon network. 

Utilizing a centralized *Custodial Wallet* architecture, donors and foundations experience a seamless Web2-like interface, while the absolute truth and security of funds are fully guaranteed by Web3 decentralization.

<br/>

## <img src="https://cdn.simpleicons.org/ethereum/white" width="24" /> PROTOCOL CAPABILITIES

* <img src="https://cdn.simpleicons.org/cashapp/white" width="16" /> **Fiat to Crypto Bridge**
  Listens to real-time webhooks from Midtrans and automatically mints MockXIDR to the Smart Contract upon successful donations.

* <img src="https://cdn.simpleicons.org/auth0/white" width="16" /> **Enterprise Security Matrix**
  Equipped with multi-layered defenses: **Zod** for strict input schema validation (Anti-Injection), **Helmet** for automated security headers, and **Express Rate Limiter** to prevent DDoS attacks. Internal error messages are fully isolated to prevent data leakage.

* <img src="https://cdn.simpleicons.org/openai/white" width="16" /> **AI Oracle Authorization**
  Provides a protected endpoint for the *AI Evaluator* to submit budget (RAB) fairness scores and verify milestone progress directly On-Chain.

* <img src="https://cdn.simpleicons.org/swagger/white" width="16" /> **OpenAPI 3.0 Standard**
  Fully interactive API contract specifications are available via Swagger UI for precise frontend integration.

<br/>

## <img src="https://cdn.simpleicons.org/codemagic/white" width="24" /> SYSTEM ARCHITECTURE

Designed with modern *Clean Architecture* patterns to maintain codebase integrity:

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

## <img src="https://cdn.simpleicons.org/gnometerminal/white" width="24" /> DEPLOYMENT SEQUENCE

**1. Prerequisites**
Node.js v18+, PostgreSQL, Midtrans Server Key credentials, and a funded relayer wallet Private Key (POL Testnet).

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

## <img src="https://cdn.simpleicons.org/readthedocs/white" width="24" /> DEVELOPER CONSOLE

While the node is running, access the interactive documentation console for API simulation:
**`http://localhost:3000/api-docs`**

<br/>

## <img src="https://cdn.simpleicons.org/ngrok/white" width="24" /> MIDTRANS LISTENER

To activate the automated relayer, configure the **Notification URL** on the Midtrans dashboard (Settings → Configuration) to the following proxy:
```text
https://<your-backend-domain>/api/webhook/midtrans
```
*(Use a tunnel like Localtunnel or Ngrok during local development).*

<br/>
<div align="center">
  <small>Decentralized Trust. Centralized Convenience.</small>
</div>
