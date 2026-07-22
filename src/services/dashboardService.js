import prisma from "../config/prisma.js";
import { ethers } from "ethers";

const XIDR_DECIMALS = 6;

async function getFoundationDashboard(foundationId) {
  const campaigns = await prisma.campaign.findMany({
    where: { foundationId },
    select: {
      id: true,
      status: true,
      targetAmount: true,
    }
  });

  const campaignIds = campaigns.map(c => c.id);

  const nonActiveStatuses = ["DRAFT", "COMPLETED", "REJECTED", "FROZEN"];
  const activeCampaignsCount = campaigns.filter(c => !nonActiveStatuses.includes(c.status)).length;

  const donations = await prisma.donation.findMany({
    where: {
      campaignId: { in: campaignIds },
      status: { in: ["PAID", "DEPOSITED"] }
    }
  });

  const totalRaisedBigInt = donations.reduce((sum, d) => sum + d.amount, 0n);
  const totalRaisedHuman = Number(ethers.formatUnits(totalRaisedBigInt, XIDR_DECIMALS).split('.')[0]);

  const uniqueDonors = new Set(donations.map(d => d.donorAddress || d.donorId)).size;

  const totalTargetBigInt = campaigns.reduce((sum, c) => sum + c.targetAmount, 0n);
  let successRate = 0;
  if (totalTargetBigInt > 0n) {
    const totalTargetHuman = Number(ethers.formatUnits(totalTargetBigInt, XIDR_DECIMALS).split('.')[0]);
    successRate = Math.min(100, Math.round((totalRaisedHuman / totalTargetHuman) * 100));
  }

  const chartData = getLast6MonthsChartData(donations);

  return {
    totalDonasi: formatCurrency(totalRaisedHuman),
    penerimaManfaat: uniqueDonors.toLocaleString('id-ID'),
    programAktif: activeCampaignsCount.toString(),
    tingkatKeberhasilan: `${successRate}%`,
    grafikDonasi: chartData,
    trends: {
      donasi: "+0%",
      penerima: "+0%",
      program: "0%",
      keberhasilan: "+0%"
    }
  };
}

function formatCurrency(num) {
  if (num >= 1000000000) {
    return `Rp ${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `Rp ${(num / 1000000).toFixed(1)}M`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
}

function getLast6MonthsChartData(donations) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      name: months[d.getMonth()],
      total: 0
    });
  }

  for (const donation of donations) {
    const dDate = new Date(donation.paidAt || donation.createdAt);
    for (const bucket of buckets) {
      if (bucket.year === dDate.getFullYear() && bucket.month === dDate.getMonth()) {
        const amountHuman = Number(ethers.formatUnits(donation.amount, XIDR_DECIMALS).split('.')[0]);
        bucket.total += amountHuman;
        break;
      }
    }
  }

  return buckets.map(b => ({
    name: b.name,
    total: b.total
  }));
}

export default { getFoundationDashboard };
