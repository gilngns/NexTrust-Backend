import express from "express";
import { getTransactions } from "../controllers/transactionController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, authorize("ADMIN", "DINSOS", "FOUNDATION"), getTransactions);

export default router;
