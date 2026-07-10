import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import * as systemController from "../controllers/systemController.js";

const router = express.Router();

router.get("/health", asyncHandler(systemController.health));

router.post(
  "/dev/simulate-payment/:orderId",
  asyncHandler(systemController.simulatePayment),
);

export default router;