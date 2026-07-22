import prisma from './src/config/prisma.js';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true }});
  const campaigns = await prisma.campaign.findMany({ select: { id: true, title: true, foundationId: true, status: true }});
  
  console.log('Users:');
  console.table(users);
  
  console.log('Campaigns:');
  console.table(campaigns);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
