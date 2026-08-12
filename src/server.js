import app from "./app.js";
import config from "./config/index.js";
import prisma from "./config/prisma.js";
import { startTokenCleanup } from "./jobs/cleanupTokens.js";

const isProd = config.nodeEnv === "production";

let serverRef = null;
let stopTokenCleanup = null;
let shuttingDown = false;

const startServer = (port) => {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`NexTrust backend berjalan di port ${port}`);
    console.log(`Dokumentasi API: /api-docs`);
    console.log(`UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE || "4 (default)"}`);

    
    
    stopTokenCleanup = startTokenCleanup();
  });

  
  
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;
  server.keepAliveTimeout = 65_000;

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      if (isProd) {
        console.error(`Port ${port} sudah dipakai. Menghentikan proses.`);
        process.exit(1);
      }
      console.warn(`Port ${port} dipakai. Mencoba ${port + 1}... (dev only)`);
      startServer(port + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  serverRef = server;
  return server;
};

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} diterima. Menutup server...`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown melebihi 10 detik. Keluar paksa.");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (stopTokenCleanup) stopTokenCleanup();

    if (serverRef) {
      await new Promise((resolve) => serverRef.close(resolve));
      console.log("Server HTTP ditutup.");
    }

    await prisma.$disconnect();
    console.log("Koneksi database ditutup.");

    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error("Gagal shutdown dengan rapi:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  if (isProd) shutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown("uncaughtException");
});

startServer(config.port);