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
      skKemenkumham: f.skKemenkumham || null,
      izinPub: f.izinPub || null,
      isVerified: f.isVerified
    }));
    res.json({ success: true, foundations: formatted });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.userId, req.body);
    res.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
}



export async function donorRegister(req, res, next) {
  try {
    const user = await authService.donorRegister(req.body);
    res.status(201).json({ ok: true, user });
  } catch (error) {
    next(error);
  }
}

export async function donorLogin(req, res, next) {
  try {
    const result = await authService.donorLogin(req.body);
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const result = await authService.refreshAccessToken(req.body.refreshToken);
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function donorLogout(req, res, next) {
  try {
    await authService.logoutDonor(req.body.refreshToken);
    res.json({ ok: true, message: "Logout berhasil" });
  } catch (error) {
    next(error);
  }
}

export async function donorMe(req, res, next) {
  try {
    const user = await authService.getMyProfile(req.user.userId);
    res.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
}

export async function donorMyDonations(req, res, next) {
  try {
    const donations = await authService.getMyDonations(req.user.userId);
    res.json({ ok: true, donations });
  } catch (error) {
    next(error);
  }
}