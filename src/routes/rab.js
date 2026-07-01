const express = require("express");
const rabController = require("../controllers/rabController");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { checkRabSchema } = require("../validations/rab.schema");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();

/**
 * @openapi
 * /api/rab/check:
 *   post:
 *     tags: [RAB]
 *     summary: Cek kewajaran RAB (gerbang sebelum campaign dibuat)
 *     description: Backend menyimpan RAB, meneruskan ke AI evaluator, menyimpan verdict. Saat ini penilaian masih MOCK (diganti API AI nanti).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               campaignDraftId: { type: string, nullable: true }
 *               targetAmount: { type: number, example: 10000000 }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: { type: string, example: Sumur bor }
 *                     qty: { type: number, example: 1 }
 *                     unitPrice: { type: number, example: 5000000 }
 *     responses:
 *       200:
 *         description: Verdict RAB
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 rab:
 *                   type: object
 *                   properties:
 *                     score: { type: integer, example: 100 }
 *                     reasonable: { type: boolean, example: true }
 *                     notes: { type: string }
 *                     source: { type: string, example: MOCK }
 *       400: { description: RAB tidak valid }
 */
router.post(
  "/rab/check",
  authenticate,
  authorize("FOUNDATION", "ADMIN"),
  validate(checkRabSchema),
  asyncHandler(rabController.checkRab)
);

/**
 * @openapi
 * /api/rab/{id}:
 *   get:
 *     tags: [RAB]
 *     summary: Ambil hasil RAB check
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Detail RAB check }
 *       404: { description: Tidak ditemukan }
 */
router.get("/rab/:id", authenticate, asyncHandler(rabController.getRabById));

module.exports = router;