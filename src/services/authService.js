const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const config = require("../config");
const walletService = require("./walletService");

class AuthService {
  /**
   * Register user. Yayasan & donatur otomatis mendapat custodial wallet
   * (di-generate & dienkripsi backend) — user tidak pernah tahu soal wallet.
   */
  async register({
    email,
    password,
    name,
    role,
    bankName,
    bankAccountNo,
    bankHolder,
  }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email sudah terdaftar");

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role || "FOUNDATION";

    let custodialAddress = null;
    let encryptedKey = null;
    if (userRole === "FOUNDATION" || userRole === "DONOR") {
      const w = walletService.generate();
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
    return this._sanitize(user);
  }

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Email atau password salah");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error("Email atau password salah");

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    return { token, user: this._sanitize(user) };
  }

  verifyToken(token) {
    return jwt.verify(token, config.jwtSecret);
  }

  _sanitize(user) {
    const { passwordHash, encryptedKey, ...rest } = user;
    return rest;
  }
}

module.exports = new AuthService();
