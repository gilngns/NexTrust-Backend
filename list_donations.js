import prisma from "./src/config/prisma.js";

async function main() {
  const donations = await prisma.donation.findMany();
  for (const d of donations) {
    console.log(`Donation ${d.id}: status=${d.status}, campaign=${d.campaignId}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
