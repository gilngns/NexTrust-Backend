import donationService from "../services/donationService.js";

/**
 * Dipakai frontend untuk polling status pembayaran (mis. QR page yang
 * auto-lanjut ke layar sukses begitu status donasi berubah jadi DEPOSITED).
 * Publik (tidak butuh login) — cuma butuh orderId yang sudah dipegang
 * pemilik donasi dari response initiate().
 */
export async function getStatus(req, res, next) {
  try {
    const status = await donationService.getStatusByOrderId(req.params.orderId);
    res.json({ ok: true, ...status });
  } catch (error) {
    next(error);
  }
}