const rabService = require("../services/rabService");

exports.checkRab = async (req, res) => {
  const result = await rabService.check(req.body);
  res.json({ ok: true, rab: result });
};

exports.getRabById = async (req, res) => {
  res.json({ ok: true, rab: await rabService.getById(req.params.id) });
};
