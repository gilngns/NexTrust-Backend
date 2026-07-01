const express = require("express");
const webhookController = require("../controllers/webhookController");
const router = express.Router();

/**
 * @openapi
 * /api/webhook/midtrans:
 *   post:
 *     tags: [Donasi]
 *     summary: Webhook Midtrans untuk update status donasi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload dari Midtrans
 *     responses:
 *       200: { description: OK }
 */
router.post("/midtrans", webhookController.midtransWebhook);

module.exports = router;
