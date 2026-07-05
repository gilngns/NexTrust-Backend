import prisma from "../config/prisma.js";

export async function getTransactions(req, res, next) {
  try {
    const donations = await prisma.donation.findMany({
      where: {
        status: {
          in: ["PAID", "DEPOSITED"],
        },
      },
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
      amount: Number(donation.amount) / 1000000,
      status: donation.status === "DEPOSITED" ? "Funds Disbursed" : "Success",
      method: "QRIS", // We don't store payment method, defaulting to QRIS based on Midtrans snap preference
    }));

    res.json({
      success: true,
      data: formattedData,
    });
  } catch (err) {
    next(err);
  }
}
