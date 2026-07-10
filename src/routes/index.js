import express from "express";
import authRoutes from "./auth.js";
import campaignRoutes from "./campaigns.js";
import payoutRoutes from "./payouts.js";
import rabRoutes from "./rab.js";
import webhookRoutes from "./webhook.js";
import systemRoutes from "./system.js";
import transactionRoutes from "./transactions.js";
import notificationRoutes from "./notifications.js";
import uploadRoutes from "./uploadRouter.js";
import donationRoutes from "./donations.js";

const router = express.Router();

router.use("/system", systemRoutes);
router.use("/auth", authRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/payouts", payoutRoutes);
router.use("/rabs", rabRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/transactions", transactionRoutes);
router.use("/notifications", notificationRoutes);
router.use("/upload", uploadRoutes);
router.use("/donations", donationRoutes);

export default router;