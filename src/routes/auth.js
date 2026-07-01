const express = require("express");
const authController = require("../controllers/authController");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validations/auth.schema");
const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrasi user (yayasan/pemda/admin)
 *     description: Yayasan otomatis mendapat custodial wallet (disembunyikan) & mengisi rekening bank.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: yayasan@nextrust.id }
 *               password: { type: string, example: password123 }
 *               name: { type: string, example: Yayasan Peduli }
 *               role: { type: string, enum: [FOUNDATION, PEMDA, ADMIN, DONOR], example: FOUNDATION }
 *               bankName: { type: string, example: BCA }
 *               bankAccountNo: { type: string, example: "1234567890" }
 *               bankHolder: { type: string, example: Yayasan Peduli }
 *     responses:
 *       200: { description: Berhasil }
 *       400: { description: Gagal, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post("/register", validate(registerSchema), asyncHandler(authController.register));

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login, mengembalikan JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: yayasan@nextrust.id }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200: { description: Token JWT }
 *       401: { description: Kredensial salah }
 */
router.post("/login", validate(loginSchema), asyncHandler(authController.login));

module.exports = router;