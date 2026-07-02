import express from 'express';
import * as webhookController from '../controllers/webhookController.js';

const router = express.Router();

router.post("/midtrans", webhookController.midtransWebhook);

export default router;
