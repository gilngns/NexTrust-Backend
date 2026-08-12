import prisma from "../config/prisma.js";
import { cachedSWR } from "../config/cache.js";

const LIST_TTL = 60_000;

function buildKey({ page, limit, category, status, sort }) {
  return `campaigns:list:${page}:${limit}:${category ?? "all"}:${status ?? "active"}:${sort ?? "recent"}`;
}

export async function getCampaignList(params) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
  const { category, status = "ACTIVE", sort = "recent" } = params;

  return cachedSWR(buildKey({ page, limit, category, status, sort }), LIST_TTL, async () => {
    const where = { status, ...(category ? { category } : {}) };

    const orderBy =
      sort === "popular" ? { donorCount: "desc" } :
      sort === "urgent"  ? { deadline: "asc" } :
                           { createdAt: "desc" };

    const [items, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnailUrl: true,
          category: true,
          targetAmount: true,
          totalRaised: true,
          donorCount: true,
          deadline: true,
          trustScore: true,
          isVerified: true,
          foundation: { select: { id: true, name: true, isVerified: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      data: items.map((c) => ({
        ...c,
        targetAmount: c.targetAmount.toString(),
        totalRaised: c.totalRaised.toString(),
        progress: Number(c.targetAmount) > 0
          ? Math.min(100, Math.round((Number(c.totalRaised) / Number(c.targetAmount)) * 100))
          : 0,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
}