import express from 'express';
import authRoutes from './auth.js';
import campaignRoutes from './campaigns.js';
import payoutRoutes from './payouts.js';
import rabRoutes from './rab.js';
import webhookRoutes from './webhook.js';
import systemRoutes from './system.js';

const router = express.Router();

router.use("/system", systemRoutes);
router.use("/auth", authRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/payouts", payoutRoutes);
router.use("/rabs", rabRoutes);
router.use("/webhooks", webhookRoutes);

export default router;
