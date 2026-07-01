const donationService = require("../services/donationService");

exports.midtransWebhook = async (req, res) => {
  try {
    const result = await donationService.handleWebhook(req.body);
    res.json({ ok: true, ...result });
  } catch (err) {

    console.error("Webhook error:", err.message);
    res.status(200).json({ ok: false, error: err.message });
  }
};
