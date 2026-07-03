import os from "os";
process.env.UV_THREADPOOL_SIZE = os.cpus().length;

import app from "./app.js";
import config from "./config/index.js";

const isProd = config.nodeEnv === "production";

const startServer = (port) => {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`NexTrust backend berjalan di port ${port}`);
    console.log(`Dokumentasi API: /api-docs`);
  });

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
};

startServer(config.port);
