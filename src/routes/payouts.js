const express = require("express");
const payoutController = require("../controllers/payoutController");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requestPayoutSchema } = require("../validations/payout.schema");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();

/**
 * @openapi
 * /api/campaigns/{id}/payout:
 *   post:
 *     tags: [Payout]
 *     summary: Ajukan pencairan ke rekening bank
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number, example: 5000000 }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  "/campaigns/:id/payout",
  authenticate,
  authorize("FOUNDATION", "ADMIN"),
  validate(requestPayoutSchema),
  asyncHandler(payoutController.requestPayout)
);

/**
 * @openapi
 * /api/payouts/{payoutId}/process:
 *   post:
 *     tags: [Payout]
 *     summary: Proses pencairan (simulasi transfer bank)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  "/payouts/:payoutId/process",
  authenticate,
  authorize("ADMIN", "FOUNDATION"),
  asyncHandler(payoutController.processPayout)
);

/**
 * @openapi
 * /api/campaigns/{id}/payouts:
 *   get:
 *     tags: [Payout]
 *     summary: List semua pencairan untuk campaign ini
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get("/campaigns/:id/payouts", asyncHandler(payoutController.listPayouts));

module.exports = router;
