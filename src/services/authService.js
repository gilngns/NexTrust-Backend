import jwt from "jsonwebtoken";
import { promisify } from "util";
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

async function register({
  email,
  password,
  name,
  role,
  bankName,
  bankAccountNo,
  bankHolder,
}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.badRequest();

  const passwordHash = await bcrypt.hash(password, 10);
  const userRole = role || "FOUNDATION";

  let custodialAddress = null;
  let encryptedKey = null;
  if (userRole === "FOUNDATION" || userRole === "DONOR") {
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
    },
  });
  return await _sanitize(user);
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw AppError.unauthorized();

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw AppError.unauthorized();

  const token = await signAsync(
    { userId: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
  return { token, user: await _sanitize(user) };
}

async function verifyToken(token) {
  return await verifyAsync(token, config.jwtSecret);
}

export default { register, login, verifyToken };
