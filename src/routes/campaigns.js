import express from "express";
import * as campaignController from "../controllers/campaignController.js";
import * as payoutController from "../controllers/payoutController.js";
import asyncHandler from "../utils/asyncHandler.js";
import validate from "../middleware/validate.js";
import {
  createCampaignSchema,
  donateSchema,
  submitMilestoneSchema,
  scoreMilestoneSchema,
  resolveFrozenSchema,
} from "../validations/campaign.schema.js";
import { requestPayoutSchema } from "../validations/payout.schema.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", asyncHandler(campaignController.listCampaigns));

router.post(
  "/",
  authenticate,
  authorize("FOUNDATION", "ADMIN"),
  validate(createCampaignSchema),
  asyncHandler(campaignController.createCampaign),
);

router.get("/:id", asyncHandler(campaignController.getCampaignById));

router.get("/:id/donations", asyncHandler(campaignController.listDonations));
router.post(
  "/:id/donations",
  validate(donateSchema),
  asyncHandler(campaignController.donate),
);

router.get("/:id/payouts", asyncHandler(payoutController.listPayouts));
router.post(
  "/:id/payouts",
  authenticate,
  authorize("FOUNDATION", "ADMIN"),
  validate(requestPayoutSchema),
  asyncHandler(payoutController.requestPayout),
);

router.post(
  "/:id/milestones/:index/submissions",
  authenticate,
  authorize("FOUNDATION", "ADMIN"),
  validate(submitMilestoneSchema),
  asyncHandler(campaignController.submitMilestone),
);

router.post(
  "/:id/milestones/:index/evaluations",
  validate(scoreMilestoneSchema),
  asyncHandler(campaignController.scoreMilestone),
);

router.post(
  "/:id/milestones/:index/releases",
  authenticate,
  authorize("ADMIN", "FOUNDATION"),
  asyncHandler(campaignController.releaseMilestone),
);

router.post(
  "/:id/advances/releases",
  authenticate,
  authorize("ADMIN", "FOUNDATION"),
  asyncHandler(campaignController.releaseAdvance),
);

router.post(
  "/:id/resolutions",
  authenticate,
  authorize("DINSOS", "ADMIN"),
  validate(resolveFrozenSchema),
  asyncHandler(campaignController.resolveFrozen),
);

export default router;
