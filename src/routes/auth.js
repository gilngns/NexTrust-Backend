import express from 'express';
import * as authController from '../controllers/authController.js';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validations/auth.schema.js';

const router = express.Router();

router.post("/register", validate(registerSchema), asyncHandler(authController.register));

router.post("/login", validate(loginSchema), asyncHandler(authController.login));

export default router;
