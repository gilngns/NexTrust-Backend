/**
 * Cek apakah wallet backend adalah owner MockXIDR (boleh mint).
 * Jalankan: node src/scripts/checkToken.js
 */
const tokenService = require("../services/tokenService");
const config = require("../config");

(async () => {
  try {
    const owner = await tokenService.owner();
    const isOwner = await tokenService.backendIsOwner();
    const backendBal = await tokenService.balanceOf(
      tokenService.backendWallet.address
    );

    console.log("Token XIDR    :", config.chain.xidrAddress);
    console.log("Owner token   :", owner);
    console.log("Wallet backend:", tokenService.backendWallet.address);
    console.log("Backend owner?:", isOwner ? "YA (boleh mint)" : "TIDAK");
    console.log("Saldo backend :", backendBal, "(satuan token, 6 desimal)");

    if (!isOwner) {
      console.log(
        "\n  Backend bukan owner token. Untuk mint, pakai wallet owner,"
      );
      console.log(
        "  atau deploy MockXIDR baru dengan backend sebagai owner (deployMock.js)."
      );
    }
  } catch (err) {
    console.error("Gagal:", err.message);
    process.exit(1);
  }
})();
