import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => `${u.name} - ${u.role} - Verified: ${u.isVerified}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
