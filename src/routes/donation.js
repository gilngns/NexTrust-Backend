import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import * as donationController from "../controllers/donationController.js";

const router = express.Router();

router.get("/:orderId/status", asyncHandler(donationController.getStatus));

export default router;