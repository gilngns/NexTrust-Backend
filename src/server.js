import os from 'os';
process.env.UV_THREADPOOL_SIZE = os.cpus().length;

import app from "./app.js";
import config from "./config/index.js";

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`NexTrust backend berjalan di http://localhost:${port}`);
    console.log(`Dokumentasi API: http://localhost:${port}/api-docs`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} sedang digunakan. Mencoba port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
};

startServer(config.port);
