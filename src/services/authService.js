import jwt from "jsonwebtoken";
import { promisify } from "util";
import crypto from "crypto";
import AppError from "../utils/AppError.js";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import config from "../config/index.js";
import walletService from "./walletService.js";

const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

async function _sanitize(user) {
  const { passwordHash, encryptedKey, ...rest } = user;
  return rest;
}

/**
 * Buat access token (jangka pendek) untuk semua role.
 */
async function _signAccessToken(userId, role) {
  return signAsync(
    { userId, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

/**
 * Buat refresh token opaque (random), simpan ke DB, return string-nya.
 * Refresh token disimpan di DB agar bisa di-revoke saat logout.
 */
async function _createRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + _parseExpiry(config.jwtRefreshExpiresIn));
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

/**
 * Parse expiry string seperti "30d", "7d", "24h" ke milliseconds.
 */
function _parseExpiry(expiry) {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Format expiry tidak valid: ${expiry}`);
  const [, num, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num) * multipliers[unit];
}

async function register({
  email,
  password,
  name,
  role,
  bankName,
  bankAccountNo,
  bankHolder,
  skKemenkumham,
  izinPub,
  phoneNumber,
  dateOfBirth,
}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.badRequest("Email sudah terdaftar");

  const passwordHash = await bcrypt.hash(password, 10);
  const userRole = role || "FOUNDATION";

  let custodialAddress = null;
  let encryptedKey = null;
  if (userRole === "FOUNDATION") {
    const w = await walletService.generate();
    custodialAddress = w.address;
    encryptedKey = w.encryptedKey;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: userRole,
      custodialAddress,
      encryptedKey,
      bankName: bankName || null,
      bankAccountNo: bankAccountNo || null,
      bankHolder: bankHolder || null,
      skKemenkumham: skKemenkumham || null,
      izinPub: izinPub || null,
      phoneNumber: phoneNumber || null,
      dateOfBirth: dateOfBirth || null,
    },
  });
  return await _sanitize(user);
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw AppError.unauthorized();

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw AppError.unauthorized();

  const token = await _signAccessToken(user.id, user.role);
  return { token, user: await _sanitize(user) };
}

async function verifyToken(token) {
  return await verifyAsync(token, config.jwtSecret);
}

async function verifyFoundation(foundationId) {
  const user = await prisma.user.findUnique({ where: { id: foundationId } });
  if (!user || user.role !== "FOUNDATION") {
    throw AppError.notFound("Yayasan tidak ditemukan");
  }

  const updated = await prisma.user.update({
    where: { id: foundationId },
    data: { isVerified: true },
  });

  return await _sanitize(updated);
}

/**
 * Update profil milik sendiri (dipakai halaman Settings — mis. lengkapi
 * data rekening bank yang dibutuhkan payoutService.autoDisburse). Hanya
 * field yang dikirim yang diupdate; field lain dibiarkan apa adanya.
 */
async function updateProfile(userId, { name, bankName, bankAccountNo, bankHolder }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User tidak ditemukan");

  const data = {};
  if (name !== undefined) data.name = name;
  if (bankName !== undefined) data.bankName = bankName;
  if (bankAccountNo !== undefined) data.bankAccountNo = bankAccountNo;
  if (bankHolder !== undefined) data.bankHolder = bankHolder;

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return await _sanitize(updated);
}

async function listFoundations() {
  const users = await prisma.user.findMany({
    where: { role: "FOUNDATION" },
    orderBy: { createdAt: "desc" },
  });
  return users.map((u) => {
    const { passwordHash, encryptedKey, ...rest } = u;
    return rest;
  });
}

// ─── Donor Auth (Mobile) ───────────────────────────────────────────────────

/**
 * Register donatur baru — selalu role DONOR.
 * `confirmPassword` sengaja tidak diteruskan, sudah divalidasi di schema layer.
 */
async function donorRegister({ email, password, name, phoneNumber, dateOfBirth }) {
  return register({
    email,
    password,
    name,
    role: "DONOR",
    phoneNumber,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
  });
}

/**
 * Login donatur → kembalikan access token (15m) + refresh token (30d).
 * Refresh token disimpan di DB agar bisa di-revoke saat logout.
 */
async function donorLogin({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "DONOR") throw AppError.unauthorized();

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw AppError.unauthorized();

  const accessToken = await _signAccessToken(user.id, user.role);
  const refreshToken = await _createRefreshToken(user.id);

  return { accessToken, refreshToken, user: await _sanitize(user) };
}

/**
 * Tukar refresh token yang valid → access token baru + refresh token baru (rotation).
 * Token lama langsung di-revoke.
 */
async function refreshAccessToken(refreshToken) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh token tidak valid atau sudah kadaluarsa");
  }

  // Revoke token lama (rotation — mencegah reuse)
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw AppError.unauthorized();

  const accessToken = await _signAccessToken(user.id, user.role);
  const newRefreshToken = await _createRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Logout donatur — revoke refresh token yang dikirim.
 */
async function logoutDonor(refreshToken) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revoked) return; // idempotent — tidak error kalau sudah revoked

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });
}

/**
 * Profil donatur yang sedang login.
 */
async function getMyProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User tidak ditemukan");
  return await _sanitize(user);
}

/**
 * Riwayat donasi donatur yang sedang login.
 */
async function getMyDonations(userId) {
  const donations = await prisma.donation.findMany({
    where: { donorId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: {
        select: { id: true, title: true, imageUrl: true, status: true },
      },
    },
  });
  return donations.map((d) => ({ ...d, amount: d.amount.toString() }));
}

export default {
  register,
  login,
  verifyToken,
  verifyFoundation,
  listFoundations,
  updateProfile,
  donorRegister,
  donorLogin,
  refreshAccessToken,
  logoutDonor,
  getMyProfile,
  getMyDonations,
};