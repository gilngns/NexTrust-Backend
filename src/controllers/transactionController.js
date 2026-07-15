import prisma from "../config/prisma.js";
import { ethers } from "ethers";

export async function getTransactions(req, res, next) {
  try {
    const whereClause = {
      status: 
      {
        in: ["PAID", "DEPOSITED", "PENDING"],
      }
    };

    if (req.user.role === "FOUNDATION") {
      whereClause.campaign = {
        foundationId: req.user.id,
      };
    }

    const donations = await prisma.donation.findMany({
      where: whereClause,
      include: {
        campaign: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedData = donations.map((donation) => ({
      id: donation.orderId,
      date: donation.paidAt
        ? donation.paidAt.toISOString()
        : donation.createdAt.toISOString(),
      campaign: donation.campaign?.title || "Unknown Campaign",
      amount: Number(ethers.formatUnits(donation.amount.toString(), 6)),
      status: donation.status === "DEPOSITED" ? "deposited" : donation.status === "PAID" ? "success" : donation.status === "PENDING" ? "pending" : "failed",
      method: "QRIS",
      donorName: donation.donorName || "Hamba Allah",
      donorAddress: donation.donorAddress || "-",
    }));

    res.json({
      success: true,
      data: formattedData,
    });
  } catch (err) {
    next(err);
  }
}
