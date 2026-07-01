/**
 * Script cek koneksi cepat — jalankan dengan: npm run check
 * Membuktikan backend bisa bicara dengan smart contract di Amoy
 * TANPA menjalankan server penuh.
 */
const contractService = require("../services/contractService");
const oracleService = require("../services/oracleService");

(async () => {
  try {
    console.log("Menghubungi jaringan & kontrak...\n");
    const status = await contractService.status();

    console.log("Terhubung!");
    console.log("  Chain ID        :", status.chainId, "(80002 = Amoy)");
    console.log("  Block terakhir  :", status.blockNumber);
    console.log("  Alamat kontrak  :", status.escrowAddress);
    console.log("  Wallet backend  :", status.backendAddress);
    console.log("  Saldo backend   :", status.backendBalancePOL, "POL");
    console.log("  Wallet oracle   :", oracleService.oracleAddress);

    if (parseFloat(status.backendBalancePOL) === 0) {
      console.log(
        "\n  Peringatan: saldo backend 0 POL. Isi dari faucet Amoy agar bisa kirim transaksi."
      );
    }
  } catch (err) {
    console.error("Gagal terhubung:", err.message);
    process.exit(1);
  }
})();
