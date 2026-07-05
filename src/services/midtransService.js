import crypto from "crypto";
import config from "../config/index.js";
import AppError from "../utils/AppError.js";

const serverKey = config.midtrans.serverKey;
const isProduction = config.midtrans.isProduction;
const baseUrl = isProduction
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

async function _authHeader() {
  const token = Buffer.from(serverKey + ":").toString("base64");
  return `Basic ${token}`;
}

async function createQris(orderId, grossAmount) {
  const res = await fetch(`${baseUrl}/v2/charge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: await _authHeader(),
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw AppError.badGateway(
      `Midtrans error: ${data.status_message || JSON.stringify(data)}`,
    );
  }

  const actions = data.actions || [];
  // Midtrans dapat memberi nama action berbeda; cari yang paling mungkin.
  const qrAction =
    actions.find((a) => a.name === "generate-qr-code") ||
    actions.find((a) => a.name === "generate-qr-code-v2") ||
    actions.find((a) => (a.name || "").includes("qr"));

  const qrisUrl = qrAction ? qrAction.url : null;

  if (!qrisUrl) {
    // Jangan diam-diam mengembalikan null — lempar agar terlihat di log & response.
    throw AppError.badGateway(
      `Midtrans tidak mengembalikan URL QR. ` +
        `status=${data.status_code} msg=${data.status_message} ` +
        `qr_string=${data.qr_string ? "ada" : "kosong"} ` +
        `actions=${JSON.stringify(actions)}`,
    );
  }

  return {
    orderId,
    transactionId: data.transaction_id,
    qrisUrl,
    qrString: data.qr_string || null,
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