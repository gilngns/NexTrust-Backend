import prisma from "../config/prisma.js";

export async function cleanupExpiredTokens() {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        {
          revoked: true,
          createdAt: { lt: new Date(Date.now() - 7 * 86400000) },
        },
      ],
    },
  });
  if (result.count > 0) {
    console.log(`[CLEANUP] ${result.count} refresh token dihapus`);
  }
}

export function startTokenCleanup() {
  cleanupExpiredTokens().catch(console.error);
  const timer = setInterval(
    () => cleanupExpiredTokens().catch(console.error),
    24 * 3600 * 1000,
  );
  timer.unref(); 
  return () => clearInterval(timer);
}