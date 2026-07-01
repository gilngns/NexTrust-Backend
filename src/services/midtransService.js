const crypto = require("crypto");
const config = require("../config");

/**
 * MidtransService — integrasi QRIS via Midtrans (Core API).
 *
 * Dipakai untuk membuat transaksi QRIS dan memverifikasi notifikasi webhook.
 * Menggunakan fetch bawaan Node (v18+), tanpa SDK tambahan.
 */
class MidtransService {
  constructor() {
    this.serverKey = config.midtrans.serverKey;
    this.isProduction = config.midtrans.isProduction;
    this.baseUrl = this.isProduction
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com";
  }

  _authHeader() {

    const token = Buffer.from(this.serverKey + ":").toString("base64");
    return `Basic ${token}`;
  }

  /**
   * Buat transaksi QRIS. Mengembalikan URL/string QR untuk ditampilkan.
   * @param {string} orderId - unik per donasi
   * @param {number} grossAmount - nominal dalam Rupiah (integer)
   */
  async createQris(orderId, grossAmount) {
    const res = await fetch(`${this.baseUrl}/v2/charge`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: this._authHeader(),
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount,
        },
        qris: { acquirer: "gopay" },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Midtrans error: ${data.status_message || JSON.stringify(data)}`
      );
    }

    const qrAction = (data.actions || []).find(
      (a) => a.name === "generate-qr-code"
    );

    return {
      orderId,
      transactionId: data.transaction_id,
      qrisUrl: qrAction ? qrAction.url : null,
      raw: data,
    };
  }

  /**
   * Verifikasi keaslian notifikasi webhook Midtrans.
   * signature_key = sha512(order_id + status_code + gross_amount + serverKey)
   */
  verifySignature(notification) {
    const { order_id, status_code, gross_amount, signature_key } = notification;
    const expected = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + this.serverKey)
      .digest("hex");
    return expected === signature_key;
  }

  /**
   * Tentukan status akhir dari notifikasi.
   * @returns {"PAID"|"PENDING"|"FAILED"|"EXPIRED"}
   */
  interpretStatus(notification) {
    const { transaction_status, fraud_status } = notification;
    if (
      transaction_status === "capture" ||
      transaction_status === "settlement"
    ) {
      if (fraud_status && fraud_status !== "accept") return "FAILED";
      return "PAID";
    }
    if (transaction_status === "pending") return "PENDING";
    if (transaction_status === "expire") return "EXPIRED";
    return "FAILED";
  }
}

module.exports = new MidtransService();
