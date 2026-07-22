import express from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import asyncHandler from "../utils/asyncHandler.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/foundation",
  authenticate,
  authorize("FOUNDATION"),
  asyncHandler(dashboardController.getFoundationDashboard)
);

export default router;
