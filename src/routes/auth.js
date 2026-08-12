import express from "express";
import * as authController from "../controllers/authController.js";
import asyncHandler from "../utils/asyncHandler.js";
import validate from "../middleware/validate.js";
import { authLimiter } from "../config/limiter.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  donorRegisterSchema,
  donorLoginSchema,
  refreshTokenSchema,
} from "../validations/auth.schema.js";
import { authenticate, authorize } from "../middleware/auth.js";

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

router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(authController.updateMe),
);



router.post(
  "/donor/register",
  authLimiter,
  validate(donorRegisterSchema),
  asyncHandler(authController.donorRegister),
);

router.post(
  "/donor/login",
  authLimiter,
  validate(donorLoginSchema),
  asyncHandler(authController.donorLogin),
);

router.post(
  "/donor/refresh",
  validate(refreshTokenSchema),
  asyncHandler(authController.refreshToken),
);

router.post(
  "/donor/logout",
  validate(refreshTokenSchema),
  asyncHandler(authController.donorLogout),
);

router.get(
  "/donor/me",
  authenticate,
  authorize("DONOR"),
  asyncHandler(authController.donorMe),
);

router.get(
  "/donor/donations",
  authenticate,
  authorize("DONOR"),
  asyncHandler(authController.donorMyDonations),
);

export default router;