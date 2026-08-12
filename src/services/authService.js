import jwt from "jsonwebtoken";
import { promisify } from "util";
import crypto from "crypto";
import AppError from "../utils/AppError.js";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import config from "../config/index.js";
import walletService from "./walletService.js";

const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

const BCRYPT_ROUNDS = 10;


const TIMING = process.env.DEBUG_TIMING === "1";

async function timed(label, fn) {
  if (!TIMING) return fn();
  const t = Date.now();
  try {
    return await fn();
  } finally {
    console.log(`[AUTH] ${label} — ${Date.now() - t}ms`);
  }
}

const dummyHashPromise = bcrypt.hash("dummy-password-for-constant-time", BCRYPT_ROUNDS);

async function _verifyPassword(password, user) {
  if (!user) {
    await bcrypt.compare(password, await dummyHashPromise);
    return false;
  }
  return bcrypt.compare(password, user.passwordHash);
}

function _sanitize(user) {
  const { passwordHash, encryptedKey, ...rest } = user;
  return rest;
}

async function _signAccessToken(userId, role) {
  return signAsync(
    { userId, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

async function _createRefreshToken(userId, tx = prisma) {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + _parseExpiry(config.jwtRefreshExpiresIn));
  await tx.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

function _parseExpiry(expiry) {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Format expiry tidak valid: ${expiry}`);
  const [, num, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num, 10) * multipliers[unit];
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

  const passwordHash = await timed("register.hash", () =>
    bcrypt.hash(password, BCRYPT_ROUNDS),
  );
  const userRole = role || "FOUNDATION";

  let custodialAddress = null;
  let encryptedKey = null;
  if (userRole === "FOUNDATION") {
    
    const w = await timed("register.walletGenerate", () => walletService.generate());
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
  return _sanitize(user);
}

async function login({ email, password }) {
  const tStart = Date.now();

  const user = await timed("login.findUnique", () =>
    prisma.user.findUnique({ where: { email } }),
  );

  const ok = await timed("login.compare", () => _verifyPassword(password, user));
  if (!ok || !user) throw AppError.unauthorized();

  const token = await timed("login.signToken", () =>
    _signAccessToken(user.id, user.role),
  );

  if (TIMING) console.log(`[AUTH] login TOTAL — ${Date.now() - tStart}ms`);

  return { token, user: _sanitize(user) };
}

async function verifyToken(token) {
  return verifyAsync(token, config.jwtSecret);
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

  return _sanitize(updated);
}

async function updateProfile(userId, { name, bankName, bankAccountNo, bankHolder }) {
  const data = {};
  if (name !== undefined) data.name = name;
  if (bankName !== undefined) data.bankName = bankName;
  if (bankAccountNo !== undefined) data.bankAccountNo = bankAccountNo;
  if (bankHolder !== undefined) data.bankHolder = bankHolder;

  if (Object.keys(data).length === 0) {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw AppError.notFound("User tidak ditemukan");
    return _sanitize(current);
  }

  try {
    
    const updated = await prisma.user.update({ where: { id: userId }, data });
    return _sanitize(updated);
  } catch (err) {
    if (err.code === "P2025") throw AppError.notFound("User tidak ditemukan");
    throw err;
  }
}

async function listFoundations({ page = 1, limit = 20 } = {}) {
  const take = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: "FOUNDATION" },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.user.count({ where: { role: "FOUNDATION" } }),
  ]);

  return {
    data: users.map(_sanitize),
    meta: { page: Number(page) || 1, limit: take, total, totalPages: Math.ceil(total / take) },
  };
}



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

async function donorLogin({ email, password }) {
  const tStart = Date.now();

  const user = await timed("donorLogin.findUnique", () =>
    prisma.user.findUnique({ where: { email } }),
  );

  const ok = await timed("donorLogin.compare", () => _verifyPassword(password, user));
  if (!ok || !user || user.role !== "DONOR") throw AppError.unauthorized();

  const [accessToken, refreshToken] = await timed("donorLogin.issueTokens", () =>
    Promise.all([
      _signAccessToken(user.id, user.role),
      _createRefreshToken(user.id),
    ]),
  );

  if (TIMING) console.log(`[AUTH] donorLogin TOTAL — ${Date.now() - tStart}ms`);

  return { accessToken, refreshToken, user: _sanitize(user) };
}

async function refreshAccessToken(refreshToken) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh token tidak valid atau sudah kadaluarsa");
  }
  if (!stored.user) throw AppError.unauthorized();

  const newRefreshToken = await prisma.$transaction(async (tx) => {
    
    
    const revoked = await tx.refreshToken.updateMany({
      where: { id: stored.id, revoked: false },
      data: { revoked: true },
    });
    if (revoked.count === 0) {
      throw AppError.unauthorized("Refresh token sudah digunakan");
    }
    return _createRefreshToken(stored.userId, tx);
  });

  const accessToken = await _signAccessToken(stored.user.id, stored.user.role);

  return { accessToken, refreshToken: newRefreshToken };
}

async function logoutDonor(refreshToken) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revoked: false },
    data: { revoked: true },
  });
}

async function getMyProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User tidak ditemukan");
  return _sanitize(user);
}

async function getMyDonations(userId, { page = 1, limit = 20 } = {}) {
  const take = Math.min(50, Math.max(1, Number(limit) || 20));
  const currentPage = Math.max(1, Number(page) || 1);

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where: { donorId: userId },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * take,
      take,
      include: {
        campaign: {
          select: { id: true, title: true, imageUrl: true, status: true },
        },
      },
    }),
    prisma.donation.count({ where: { donorId: userId } }),
  ]);

  return {
    data: donations.map((d) => ({ ...d, amount: d.amount.toString() })),
    meta: { page: currentPage, limit: take, total, totalPages: Math.ceil(total / take) },
  };
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