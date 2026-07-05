import crypto from "crypto";
import config from "../config/index.js";
import AppError from "../utils/AppError.js";

const serverKey = config.midtrans.serverKey;
const isProduction = config.midtrans.isProduction;
const baseUrl = isProduction
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

// Snap memakai host berbeda dari Core API.
const snapUrl = isProduction
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

async function _authHeader() {
  const token = Buffer.from(serverKey + ":").toString("base64");
  return `Basic ${token}`;
}

async function createQris(orderId, grossAmount) {
  // Pakai Snap: 1 halaman pembayaran yang menampilkan semua channel aktif
  // (QRIS, GoPay, VA, dll) sesuai Snap Preferences. Lebih andal daripada Core
  // API /v2/charge yang butuh aktivasi channel per-metode.
  const res = await fetch(snapUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: await _authHeader(),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      // Utamakan QRIS & GoPay agar donatur bisa scan QR.
      enabled_payments: ["qris", "gopay", "shopeepay", "other_qris"],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw AppError.badGateway(
      `Midtrans Snap error: status=${res.status} ` +
        `msg=${data.error_messages ? data.error_messages.join(", ") : JSON.stringify(data)}`,
    );
  }

  if (!data.redirect_url) {
    throw AppError.badGateway(
      `Midtrans Snap tidak mengembalikan redirect_url: ${JSON.stringify(data)}`,
    );
  }

  return {
    orderId,
    snapToken: data.token,
    // Halaman donasi memakai `qrisUrl` sebagai link bayar — isi dengan
    // redirect_url Snap (halaman pembayaran Midtrans).
    qrisUrl: data.redirect_url,
    raw: data,
  };
}

async function verifySignature(notification) {
  const { order_id, status_code, gross_amount, signature_key } = notification;
  const expected = crypto
    .createHash("sha512")
    .update(order_id + status_code + gross_amount + serverKey)
    .digest("hex");
  return expected === signature_key;
}

async function interpretStatus(notification) {
  const { transaction_status, fraud_status } = notification;
  if (transaction_status === "capture" || transaction_status === "settlement") {
    if (fraud_status && fraud_status !== "accept") return "FAILED";
    return "PAID";
  }
  if (transaction_status === "pending") return "PENDING";
  if (transaction_status === "expire") return "EXPIRED";
  return "FAILED";
}

export default { createQris, verifySignature, interpretStatus };