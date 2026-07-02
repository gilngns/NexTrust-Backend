import donationService from "../services/donationService.js";

export async function midtransWebhook(req, res, next) {
  try {
    const result = await donationService.handleWebhook(req.body);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(200).json({ ok: false, error: err.message });
  }
}
