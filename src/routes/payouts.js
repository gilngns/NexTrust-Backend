import express from 'express';
import * as payoutController from '../controllers/payoutController.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post(
  "/:payoutId/process",
  authenticate,
  authorize("ADMIN", "FOUNDATION"),
  asyncHandler(payoutController.processPayout)
);

export default router;
