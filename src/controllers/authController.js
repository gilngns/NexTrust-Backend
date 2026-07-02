import authService from "../services/authService.js";

export async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    res.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}
