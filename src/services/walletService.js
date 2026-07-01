const { ethers } = require("ethers");
const crypto = require("crypto");
const config = require("../config");

/**
 * WalletService — mengelola custodial wallet.
 *
 * Setiap user (yayasan/donatur) mendapat wallet yang di-generate & dikontrol
 * backend. User tidak pernah tahu wallet-nya. Private key disimpan terenkripsi
 * (AES-256-GCM) di database, tidak pernah dalam bentuk mentah.
 *
 * Catatan produksi: untuk skala nyata, kunci enkripsi harus dikelola KMS/HSM,
 * bukan variabel env. Ini cukup untuk tahap testnet/demo.
 */
class WalletService {
  constructor() {

    this.encKey = crypto
      .createHash("sha256")
      .update(config.walletEncryptionSecret)
      .digest();
  }

  /** Buat wallet baru. Mengembalikan alamat + private key terenkripsi. */
  generate() {
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = this._encrypt(wallet.privateKey);
    return { address: wallet.address, encryptedKey };
  }

  /** Kembalikan signer ethers dari private key terenkripsi (untuk transaksi). */
  getSigner(encryptedKey, provider) {
    const privateKey = this._decrypt(encryptedKey);
    return new ethers.Wallet(privateKey, provider);
  }

  _encrypt(plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encKey, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
  }

  _decrypt(payload) {
    const [ivHex, tagHex, dataHex] = payload.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encKey,
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  }
}

module.exports = new WalletService();
