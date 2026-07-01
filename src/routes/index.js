const express = require("express");
const authRoutes = require("./auth");
const campaignRoutes = require("./campaigns");
const payoutRoutes = require("./payouts");
const rabRoutes = require("./rab");
const webhookRoutes = require("./webhook");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/", campaignRoutes);
router.use("/", payoutRoutes);
router.use("/", rabRoutes);
router.use("/webhook", webhookRoutes);

module.exports = router;
