import express from "express";
import { getNotifications, markAsRead } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getNotifications);
router.post("/read", markAsRead);

export default router;
