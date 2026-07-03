import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import * as systemController from "../controllers/systemController.js";

const router = express.Router();

router.get("/health", asyncHandler(systemController.health));

export default router;
