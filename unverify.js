import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.user.updateMany({
    where: { role: 'FOUNDATION' },
    data: { isVerified: false },
  });
  console.log(`Updated ${result.count} foundations to unverified`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
