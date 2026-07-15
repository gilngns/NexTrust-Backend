import 'dotenv/config';
import prisma from './src/config/prisma.js';
import campaignService from './src/services/campaignService.js';

async function main() {
  try {
    const foundation = await prisma.user.findFirst({ where: { role: 'FOUNDATION' } });
    if (!foundation) {
      console.log("No foundation found to test with");
      return;
    }
    
    console.log("Found foundation:", foundation.id);

    const result = await campaignService.create({
      onChainId: "TEST_CMP_" + Date.now(),
      title: "Test Campaign",
      description: "Test Desc",
      imageUrl: "http://example.com/img.jpg",
      category: "PEMBANGUNAN",
      rabCID: "QmTest",
      targetAmount: 100000000, // 100 Juta
      advanceAmount: 15000000, // 15 Juta
      milestoneAmount: 85000000,
      totalMilestones: 3,
      foundationId: foundation.id,
      latitude: 0,
      longitude: 0,
      izinPub: "123",
      aiScore: 90,
      aiNotes: "Good",
      rabData: []
    });

    console.log("Success:", result);
  } catch (err) {
    console.error("CREATE FAILED:", err);
  }
}

main().finally(() => process.exit(0));
