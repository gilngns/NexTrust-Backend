import contractService from "../services/contractService.js";
import oracleService from "../services/oracleService.js";
import prisma from "../config/prisma.js";
import config from "../config/index.js";
import midtransService from "../services/midtransService.js";
import donationService from "../services/donationService.js";
import AppError from "../utils/AppError.js";

export async function health(req, res, next) {
  try {
    const status = await contractService.status();
    res.json({
      ok: true,
      oracleAddress: await oracleService.getOracleAddress(),
      ...status,
    });
  } catch (error) {
    next(error);
  }
}

export async function simulatePayment(req, res, next) {
  try {
    if (config.nodeEnv === "production") {
      return next(AppError.forbidden("Simulator pembayaran dinonaktifkan di production."));
    }

    const { orderId } = req.params;
    const donation = await prisma.donation.findUnique({ where: { orderId } });
    if (!donation) throw AppError.notFound("Donasi dengan order_id tersebut tidak ditemukan.");
    if (donation.status === "DEPOSITED") {
      return res.json({ ok: true, status: "already_processed" });
    }

    const grossAmountRupiah = Number(
      (donation.amount / 1_000_000n).toString(), // XIDR_DECIMALS = 6
    );
    const fakeNotification = midtransService.buildSimulatedNotification(
      orderId,
      grossAmountRupiah,
    );

    const result = await donationService.handleWebhook(fakeNotification);
    res.json({ ok: true, simulated: true, ...result });
  } catch (error) {
    next(error);
  }
}