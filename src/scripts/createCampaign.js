/**
 * Buat campaign baru di kontrak.
 * Jalankan: node src/scripts/createCampaign.js <campaignId> [beneficiary]
 * Contoh   : node src/scripts/createCampaign.js CAMP-001
 *
 * Jika beneficiary tidak diberikan, memakai wallet backend (untuk testing).
 * Semua nominal dalam XIDR (6 desimal) — dikonversi otomatis.
 */
const { ethers } = require("ethers");
const contractService = require("../services/contractService");

const DECIMALS = 6;
const toUnits = (n) => ethers.parseUnits(n.toString(), DECIMALS);

const PARAMS = {
  targetAmount: toUnits(1000),
  advanceAmount: toUnits(100),
  milestoneAmount: toUnits(180),
  totalMilestones: 5,
  rabCID: "QmDemoRAB",
};

(async () => {
  const [campaignId, beneficiaryArg] = process.argv.slice(2);
  if (!campaignId) {
    console.log(
      "Usage: node src/scripts/createCampaign.js <campaignId> [beneficiary]"
    );
    process.exit(1);
  }

  const beneficiary =
    beneficiaryArg || contractService.backendWallet.address;

  try {
    console.log("Membuat campaign...");
    console.log("  ID          :", campaignId);
    console.log("  Target      : 1000 XIDR");
    console.log("  Advance     : 100 XIDR");
    console.log("  Milestone   : 180 XIDR x 5");
    console.log("  Beneficiary :", beneficiary);
    console.log("");

    const result = await contractService.createCampaign({
      campaignIdStr: campaignId,
      targetAmount: PARAMS.targetAmount,
      advanceAmount: PARAMS.advanceAmount,
      milestoneAmount: PARAMS.milestoneAmount,
      totalMilestones: PARAMS.totalMilestones,
      rabCID: PARAMS.rabCID,
      beneficiary,
    });

    console.log("Campaign dibuat!");
    console.log("  tx hash     :", result.txHash);
    console.log("  campaignId  :", result.campaignId, "(bytes32)");
    console.log("\nLangkah berikutnya: deposit dana");
    console.log(
      `  node src/scripts/demoDeposit.js ${campaignId} 1000 ${beneficiary}`
    );
  } catch (err) {
    console.error("Gagal:", err.message);
    process.exit(1);
  }
})();
