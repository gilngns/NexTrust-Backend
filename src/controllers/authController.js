const authService = require("../services/authService");

exports.register = async (req, res) => {
  const user = await authService.register(req.body);
  res.json({ ok: true, user });
};

exports.login = async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ ok: true, ...result });
};
