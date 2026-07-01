const app = require("./app");
const config = require("./config");

app.listen(config.port, () => {
  console.log(`NexTrust backend berjalan di http://localhost:${config.port}`);
  console.log(`Dokumentasi API: http://localhost:${config.port}/api-docs`);
});