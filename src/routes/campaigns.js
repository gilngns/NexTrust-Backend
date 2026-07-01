const express = require("express");
const campaignController = require("../controllers/campaignController");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { 
  createCampaignSchema, 
  donateSchema, 
  submitMilestoneSchema, 
  scoreMilestoneSchema, 
  resolveFrozenSchema 
} = require("../validations/campaign.schema");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Status koneksi Smart Contract dan Oracle
 *     responses:
 *       200: { description: OK }
 */
router.get("/health", asyncHandler(campaignController.health));

/**
 * @openapi
 * /api/campaigns:
 *   get:
 *     tags: [Campaign]
 *     summary: List semua campaign
 *     responses:
 *       200: { description: Berhasil }
 */
router.get("/campaigns", asyncHandler(campaignController.listCampaigns));

/**
 * @openapi
 * /api/campaigns/{id}:
 *   get:
 *     tags: [Campaign]
 *     summary: Detail campaign
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not Found }
 */
router.get("/campaigns/:id", asyncHandler(campaignController.getCampaignById));

/**
 * @openapi
 * /api/campaigns:
 *   post:
 *     tags: [Campaign]
 *     summary: Buat campaign (Yayasan / Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: "Bantuan Air Bersih" }
 *               description: { type: string, example: "Deskripsi campaign" }
 *               targetAmount: { type: number, example: 10000000 }
 *               durationDays: { type: number, example: 30 }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  "/campaigns",
  authenticate,
  authorize("FOUNDATION", "ADMIN"),
  validate(createCampaignSchema),
  asyncHandler(campaignController.createCampaign)
);

/**
 * @openapi
 * /api/campaigns/{id}/donate:
 *   post:
 *     tags: [Donasi]
 *     summary: Mulai donasi (generate Midtrans Snap Token)
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
 *               donorName: { type: string, example: "John Doe" }
 *               amount: { type: number, example: 50000 }
 *     responses:
 *       200: { description: OK }
 */
router.post("/campaigns/:id/donate", validate(donateSchema), asyncHandler(campaignController.donate));

/**
 * @openapi
 * /api/campaigns/{id}/donations:
 *   get:
 *     tags: [Donasi]
 *     summary: List donasi untuk campaign
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get("/campaigns/:id/donations", asyncHandler(campaignController.listDonations));

/**
 * @openapi
 * /api/campaigns/{id}/milestones/{index}/submit:
 *   post:
 *     tags: [Milestone]
 *     summary: Submit bukti milestone
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: index
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               proofUrl: { type: string }
 *               description: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  "/campaigns/:id/milestones/:index/submit",
  authenticate,
  authorize("FOUNDATION", "ADMIN"),
  validate(submitMilestoneSchema),
  asyncHandler(campaignController.submitMilestone)
);

/**
 * @openapi
 * /api/campaigns/{id}/milestones/{index}/score:
 *   post:
 *     tags: [Milestone]
 *     summary: AI submit skor milestone
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: index
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score: { type: integer, example: 85 }
 *               nonce: { type: integer, example: 12345 }
 *     responses:
 *       200: { description: OK }
 */
router.post("/campaigns/:id/milestones/:index/score", validate(scoreMilestoneSchema), asyncHandler(campaignController.scoreMilestone));

/**
 * @openapi
 * /api/campaigns/{id}/release-advance:
 *   post:
 *     tags: [Milestone]
 *     summary: Cairkan dana awal (DP)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  "/campaigns/:id/release-advance",
  authenticate,
  authorize("ADMIN", "FOUNDATION"),
  asyncHandler(campaignController.releaseAdvance)
);

/**
 * @openapi
 * /api/campaigns/{id}/milestones/{index}/release:
 *   post:
 *     tags: [Milestone]
 *     summary: Cairkan dana milestone (setelah skor valid)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: index
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  "/campaigns/:id/milestones/:index/release",
  authenticate,
  authorize("ADMIN", "FOUNDATION"),
  asyncHandler(campaignController.releaseMilestone)
);

/**
 * @openapi
 * /api/campaigns/{id}/resolve:
 *   post:
 *     tags: [Pemda]
 *     summary: Resolve frozen campaign
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
 *               approve: { type: boolean, example: true }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  "/campaigns/:id/resolve",
  authenticate,
  authorize("PEMDA", "ADMIN"),
  validate(resolveFrozenSchema),
  asyncHandler(campaignController.resolveFrozen)
);

module.exports = router;
