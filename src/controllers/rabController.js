import rabService from "../services/rabService.js";

export async function checkRab(req, res, next) {
  try {
    const result = await rabService.check(req.body);
    res.json({ ok: true, rab: result });
  } catch (error) {
    next(error);
  }
}

export async function getRabById(req, res, next) {
  try {
    res.json({ ok: true, rab: await rabService.getById(req.params.id) });
  } catch (error) {
    next(error);
  }
}
