import dotenv from "dotenv";

dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Environment variable ${name} belum diset. Cek file .env kamu.`
    );
  }
  return v;
}

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  databaseUrl: process.env.DATABASE_URL || "",

  jwtSecret: process.env.JWT_SECRET || "dev-secret-ganti-di-produksi",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",

  walletEncryptionSecret:
    process.env.WALLET_ENCRYPTION_SECRET || "dev-wallet-secret-ganti",

  chain: {
    rpcUrl: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
    escrowAddress: required("ESCROW_ADDRESS"),
    xidrAddress: process.env.XIDR_ADDRESS || "",
    backendPrivateKey: required("BACKEND_PRIVATE_KEY"),
    oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY || "",
  },

  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY || "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  },
};

export default config;
