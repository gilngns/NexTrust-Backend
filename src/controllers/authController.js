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

export async function verifyFoundation(req, res, next) {
  try {
    const user = await authService.verifyFoundation(req.params.id);
    res.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
}

export async function listFoundations(req, res, next) {
  try {
    const foundations = await authService.listFoundations();
    const formatted = foundations.map(f => ({
      id: f.id,
      name: f.name,
      email: f.email,
      skKemenkumham: f.skKemenkumham || true,
      izinPub: f.izinPub || null,
      isVerified: f.isVerified
    }));
    res.json({ success: true, foundations: formatted });
  } catch (error) {
    next(error);
  }
}