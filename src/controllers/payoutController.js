import payoutService from "../services/payoutService.js";

export async function requestPayout(req, res, next) {
  try {
    const result = await payoutService.request({
      campaignId: req.params.id,
      amount: req.body.amount,
    });
    res.json({ ok: true, payout: result });
  } catch (error) {
    next(error);
  }
}

export async function processPayout(req, res, next) {
  try {
    const result = await payoutService.process(req.params.payoutId);
    res.json({ ok: true, payout: result });
  } catch (error) {
    next(error);
  }
}

export async function listPayouts(req, res, next) {
  try {
    const result = await payoutService.listByCampaign(req.params.id);
    res.json({ ok: true, payouts: result });
  } catch (error) {
    next(error);
  }
}
