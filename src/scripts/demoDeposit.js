/**
 * Demo alur deposit end-to-end (testnet):
 *   1. mint MockXIDR ke wallet backend (simulasi dana QRIS masuk)
 *   2. approve escrow
 *   3. depositXIDR ke campaign
 *   4. baca locked funds untuk konfirmasi
 *
 * Prasyarat: campaign dengan ID di bawah sudah dibuat (createCampaign).
 * Jalankan: node src/scripts/demoDeposit.js <campaignId> <amount> <donorAddress>
 * Contoh   : node src/scripts/demoDeposit.js CAMP-001 1000 0x37B4...238E
 */
const tokenService = require("../services/tokenService");
const contractService = require("../services/contractService");

(async () => {
  const [campaignId, amount, donor] = process.argv.slice(2);
  if (!campaignId || !amount || !donor) {
    console.log(
      "Usage: node src/scripts/demoDeposit.js <campaignId> <amount> <donorAddress>"
    );
    process.exit(1);
  }

  try {
    console.log(`\n1) Mint ${amount} XIDR ke wallet backend...`);
    const mintRes = await tokenService.mint(
      tokenService.backendWallet.address,
      amount
    );
    console.log("   tx:", mintRes.txHash);

    console.log(`\n2) Approve escrow untuk ${amount} XIDR...`);
    const apprRes = await tokenService.approveEscrow(amount);
    console.log("   tx:", apprRes.txHash);

    console.log(`\n3) depositXIDR ke campaign ${campaignId} untuk donor ${donor}...`);
    const amountUnits = await tokenService.toUnits(amount);
    const depRes = await contractService.depositXIDR({
      campaignIdStr: campaignId,
      amount: amountUnits,
      donorAddress: donor,
    });
    console.log("   tx:", depRes.txHash);

    console.log("\n4) Cek locked funds campaign...");
    const locked = await contractService.getLockedFunds(campaignId);
    console.log("   lockedFunds:", locked, "(satuan token)");

    console.log("\nSelesai. Dana berhasil dikunci di escrow.");
  } catch (err) {
    console.error("\nGagal:", err.message);
    process.exit(1);
  }
})();
