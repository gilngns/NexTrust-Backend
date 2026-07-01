const payoutService = require("../services/payoutService");

exports.requestPayout = async (req, res) => {
  const result = await payoutService.request({
    campaignId: req.params.id,
    amount: req.body.amount,
  });
  res.json({ ok: true, payout: result });
};

exports.processPayout = async (req, res) => {
  const result = await payoutService.process(req.params.payoutId);
  res.json({ ok: true, payout: result });
};

exports.listPayouts = async (req, res) => {
  res.json({
    ok: true,
    payouts: await payoutService.listByCampaign(req.params.id),
  });
};
