import AppError from "../utils/AppError.js";
import authService from "../services/authService.js";

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(AppError.unauthorized());

  try {
    req.user = await authService.verifyToken(token);
    return next();
  } catch (_) {
    return next(AppError.unauthorized());
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(AppError.forbidden());
    }
    next();
  };
}
