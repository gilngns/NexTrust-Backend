import prisma from "./src/config/prisma.js";
import donationService from "./src/services/donationService.js";

async function main() {
  const donations = await prisma.donation.findMany({
    where: { status: "PAID" }
  });

  console.log(`Found ${donations.length} PAID donations.`);

  for (const d of donations) {
    console.log(`Settling donation: ${d.id} for campaign: ${d.campaignId}...`);
    try {
      const res = await donationService.settleDonation(d.id);
      console.log(`Success:`, res.status, res.txHash);
    } catch (e) {
      console.error(`Failed to settle ${d.id}:`, e.message);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
