import prisma from "../config/prisma.js";
import { cachedSWR } from "../config/cache.js";
import { ethers } from "ethers";

const LIST_TTL = 60_000;

function buildKey({ page, limit, category, status, sort }) {
  return `campaigns:list:${page}:${limit}:${category ?? "all"}:${status ?? "all"}:${sort ?? "recent"}`;
}

export async function getCampaignList(params) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
  const { category, status, sort = "recent" } = params;

  return cachedSWR(buildKey({ page, limit, category, status, sort }), LIST_TTL, async () => {
    const where = {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
    };

    const orderBy =
      sort === "popular" ? { donorCount: "desc" } :
                           { createdAt: "desc" };

    const [items, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          onChainId: true,
          title: true,
          description: true,
          imageUrl: true,
          category: true,
          status: true,
          targetAmount: true,
          advanceAmount: true,
          milestoneAmount: true,
          totalMilestones: true,
          totalRaised: true,
          donorCount: true,
          aiScore: true,
          createdAt: true,
          txHashCreate: true,
          foundation: { select: { name: true } },
          milestones: true,
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    const campaigns = items.map((c) => {
      // Serialize BigInt fields
      const targetAmountStr = Math.round(Number(ethers.formatUnits(c.targetAmount, 6))).toString();
      const advanceAmountStr = Math.round(Number(ethers.formatUnits(c.advanceAmount, 6))).toString();
      const milestoneAmountStr = Math.round(Number(ethers.formatUnits(c.milestoneAmount, 6))).toString();
      const collectedAmount = Number(c.totalRaised || 0);
      const collectedAmountStr = Math.round(Number(ethers.formatUnits(BigInt(collectedAmount), 6))).toString();
      const targetAmtNum = Number(targetAmountStr) || 0;
      const collectedAmtNum = Number(collectedAmountStr) || 0;

      return {
        ...c,
        targetAmount: targetAmountStr,
        advanceAmount: advanceAmountStr,
        milestoneAmount: milestoneAmountStr,
        collectedAmount: collectedAmountStr,
        donorCount: c.donorCount,
        isTargetReached: collectedAmtNum >= targetAmtNum,
        canDonate: c.status === "ACTIVE" && collectedAmtNum < targetAmtNum,
        explorerUrl: c.txHashCreate ? `https://amoy.polygonscan.com/tx/${c.txHashCreate}` : null,
        milestones: c.milestones.map((m) => ({
          ...m,
          amount: m.amount != null ? Math.round(Number(ethers.formatUnits(m.amount, 6))).toString() : null,
          evidenceUrl: m.evidenceUrl || (m.evidenceCID ? `https://gateway.pinata.cloud/ipfs/${m.evidenceCID}` : null),
          evidenceUrl2: m.evidenceUrl2 || null,
          explorerUrl: m.txHashRelease ? `https://amoy.polygonscan.com/tx/${m.txHashRelease}`
            : (m.txHashSubmit ? `https://amoy.polygonscan.com/tx/${m.txHashSubmit}` : null),
          isReleased: m.status === "RELEASED",
        })),
      };
    });

    return {
      ok: true,
      campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
}