import 'dotenv/config';
import prisma from './src/config/prisma.js';
import donationService from './src/services/donationService.js';

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("Looking for recent PAID donations...");
  const donation = await prisma.donation.findFirst({
    where: { status: 'PAID' },
    orderBy: { createdAt: 'desc' }
  });
  if (!donation) {
    console.log("No PAID donation found. Let's check PENDING or DEPOSITED ones to see what we have.");
    const all = await prisma.donation.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log("Recent donations:", all.map(d => ({ id: d.id, orderId: d.orderId, status: d.status })));
    return;
  }
  console.log("Found PAID donation:", donation.id, donation.orderId);
  try {
    const result = await donationService.settleDonation(donation.id);
    console.log("Settlement success:", result);
  } catch (err) {
    console.error("Settlement error:", err);
  }
}

main().finally(() => process.exit(0));
