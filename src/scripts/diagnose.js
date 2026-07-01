/**
 * Diagnosa kenapa createCampaign/depositXIDR revert.
 * Cek: role backend, status paused, alamat backend & oracle di kontrak.
 * Jalankan: node src/scripts/diagnose.js
 */
const { ethers } = require("ethers");
const config = require("../config");
const fullAbi = require("../../abi/TrustFundEscrow.full.json");

(async () => {
  try {
    const provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);
    const wallet = new ethers.Wallet(config.chain.backendPrivateKey, provider);
    const escrow = new ethers.Contract(
      config.chain.escrowAddress,
      fullAbi,
      provider
    );

    console.log("Wallet backend :", wallet.address);
    console.log("Kontrak escrow :", config.chain.escrowAddress);
    console.log("");

    const paused = await escrow.paused();
    console.log("paused()             :", paused, paused ? "<- MASALAH: kontrak di-pause" : "(ok)");

    const backendRole = await escrow.BACKEND_ROLE();
    const hasBackendRole = await escrow.hasRole(backendRole, wallet.address);
    console.log("BACKEND_ROLE hash    :", backendRole);
    console.log("wallet punya role?   :", hasBackendRole, hasBackendRole ? "(ok)" : "<- MASALAH: tidak punya BACKEND_ROLE");

    const backendWallet = await escrow.backendWallet();
    const oracleSigner = await escrow.oracleSigner();
    console.log("backendWallet()      :", backendWallet);
    console.log("oracleSigner()       :", oracleSigner);
    console.log("");

    if (paused) {
      console.log("=> Kontrak sedang paused. Panggil unpause() dengan admin.");
    } else if (!hasBackendRole) {
      console.log("=> Wallet ini TIDAK punya BACKEND_ROLE di kontrak ini.");
      console.log("   Grant role dengan wallet admin, atau pakai wallet yang benar.");
    } else {
      console.log("=> Role & pause OK. Revert kemungkinan dari validasi lain.");
    }
  } catch (err) {
    console.error("Gagal diagnosa:", err.message);
    process.exit(1);
  }
})();
