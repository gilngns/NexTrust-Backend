import crypto from "crypto";
import config from "../config/index.js";
import AppError from "../utils/AppError.js";

const serverKey = config.midtrans.serverKey;
const isProduction = config.midtrans.isProduction;
const baseUrl = isProduction
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

const snapUrl = isProduction
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

async function _authHeader() {
  const token = Buffer.from(serverKey + ":").toString("base64");
  return `Basic ${token}`;
}

async function createQris(orderId, grossAmount) {
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

function buildSimulatedNotification(orderId, grossAmount) {
  const status_code = "200";
  const gross_amount = Number(grossAmount).toFixed(2);
  const signature_key = crypto
    .createHash("sha512")
    .update(orderId + status_code + gross_amount + serverKey)
    .digest("hex");

  return {
    order_id: orderId,
    status_code,
    gross_amount,
    signature_key,
    transaction_status: "settlement",
    fraud_status: "accept",
    payment_type: "qris",
    transaction_time: new Date().toISOString(),
  };
}

export default {
  createQris,
  verifySignature,
  interpretStatus,
  buildSimulatedNotification,
};