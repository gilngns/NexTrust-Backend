import express from "express";
import * as authController from "../controllers/authController.js";
import asyncHandler from "../utils/asyncHandler.js";
import validate from "../middleware/validate.js";
import { authLimiter } from "../config/limiter.js";
import { registerSchema, loginSchema } from "../validations/auth.schema.js";

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);

import { authenticate, authorize } from "../middleware/auth.js";

router.put(
  "/verify-foundation/:id",
  authenticate,
  authorize("DINSOS"),
  asyncHandler(authController.verifyFoundation)
);

router.get(
  "/foundations",
  authenticate,
  authorize("DINSOS", "ADMIN"),
  asyncHandler(authController.listFoundations)
);

export default router;