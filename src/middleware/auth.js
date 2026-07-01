const authService = require("../services/authService");

/** Wajib login: verifikasi token JWT. */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: "Token tidak ada" });
  }
  try {
    req.user = authService.verifyToken(token);
    next();
  } catch (_) {
    return res.status(401).json({ ok: false, error: "Token tidak valid" });
  }
}

/** Batasi ke role tertentu. Pakai setelah authenticate. */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: "Akses ditolak" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
