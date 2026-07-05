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

async function _charge(body) {
  const res = await fetch(`${baseUrl}/v2/charge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: await _authHeader(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}

function _extractQrUrl(data) {
  const actions = data.actions || [];
  const qrAction =
    actions.find((a) => a.name === "generate-qr-code") ||
    actions.find((a) => a.name === "generate-qr-code-v2") ||
    actions.find((a) => (a.name || "").includes("qr")) ||
    // GoPay memberi action "deeplink-redirect" / "generate-qr-code" juga
    actions.find((a) => (a.name || "").includes("deeplink"));
  return qrAction ? qrAction.url : null;
}

async function createQris(orderId, grossAmount) {
  const txDetails = { order_id: orderId, gross_amount: grossAmount };

  // 1) Coba QRIS (sesuai konsep utama).
  let { res, data } = await _charge({
    payment_type: "qris",
    transaction_details: txDetails,
  });

  // 2) Jika QRIS belum aktif di akun (402 channel not activated),
  //    fallback ke GoPay yang juga menghasilkan QR untuk di-scan.
  const channelInactive =
    !res.ok && String(data.status_code) === "402";

  if (channelInactive) {
    ({ res, data } = await _charge({
      payment_type: "gopay",
      transaction_details: txDetails,
    }));
  }

  if (!res.ok) {
    throw AppError.badGateway(
      `Midtrans error: status=${data.status_code} msg=${data.status_message}`,
    );
  }

  const qrisUrl = _extractQrUrl(data);

  if (!qrisUrl) {
    throw AppError.badGateway(
      `Midtrans tidak mengembalikan URL QR. ` +
        `status=${data.status_code} msg=${data.status_message} ` +
        `payment_type=${data.payment_type} ` +
        `actions=${JSON.stringify(data.actions || [])}`,
    );
  }

  return {
    orderId,
    transactionId: data.transaction_id,
    paymentType: data.payment_type,
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