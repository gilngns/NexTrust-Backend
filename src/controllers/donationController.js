import donationService from "../services/donationService.js";


export async function getStatus(req, res, next) {
  try {
    const status = await donationService.getStatusByOrderId(req.params.orderId);
    res.json({ ok: true, ...status });
  } catch (error) {
    next(error);
  }
}