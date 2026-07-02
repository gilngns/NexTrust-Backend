import express from 'express';
import * as rabController from '../controllers/rabController.js';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { checkRabSchema } from '../validations/rab.schema.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("FOUNDATION", "ADMIN"),
  validate(checkRabSchema),
  asyncHandler(rabController.checkRab)
);

router.get("/:id", authenticate, asyncHandler(rabController.getRabById));

export default router;
