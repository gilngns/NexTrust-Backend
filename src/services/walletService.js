import { ethers } from "ethers";
import crypto from "crypto";
import config from "../config/index.js";

const encKey = crypto
  .createHash("sha256")
  .update(config.walletEncryptionSecret)
  .digest();

async function _encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

async function _decrypt(payload) {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encKey,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

async function generate() {
  const wallet = ethers.Wallet.createRandom();
  const encryptedKey = await _encrypt(wallet.privateKey);
  return { address: wallet.address, encryptedKey };
}

async function getSigner(encryptedKey, provider) {
  const privateKey = await _decrypt(encryptedKey);
  return new ethers.Wallet(privateKey, provider);
}

export default { generate, getSigner };
