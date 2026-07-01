const { ethers } = require("ethers");
const config = require("../config");
const escrowAbi = require("../../abi/TrustFundEscrow.json");

/**
 * OracleService — merepresentasikan "AI yang menilai".
 *
 * Setelah AI mengevaluasi bukti milestone dan menghasilkan skor (0-100),
 * skor itu harus dikirim ke kontrak lewat oracleCallback. Kontrak hanya
 * menerima skor yang ditandatangani oracle yang sah (ECDSA), terikat pada
 * alamat kontrak + chainId + campaignId + nonce (anti-replay).
 *
 * Format signature di sini WAJIB sama persis dengan yang diverifikasi
 * di dalam kontrak.
 */
class OracleService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);

    const oracleKey =
      config.chain.oraclePrivateKey || config.chain.backendPrivateKey;
    this.oracleWallet = new ethers.Wallet(oracleKey, this.provider);

    this.backendWallet = new ethers.Wallet(
      config.chain.backendPrivateKey,
      this.provider
    );
    this.escrow = new ethers.Contract(
      config.chain.escrowAddress,
      escrowAbi,
      this.backendWallet
    );
  }

  /**
   * Buat signature untuk sebuah skor.
   * Meniru: solidityPackedKeccak256(
   *   ["address","uint256","bytes32","uint8","uint256"],
   *   [escrow, chainId, campaignId, score, nonce]
   * ) lalu ditandatangani sebagai Ethereum Signed Message.
   */
  async signScore({ campaignId, score, nonce }) {
    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "bytes32", "uint8", "uint256"],
      [config.chain.escrowAddress, chainId, campaignId, score, nonce]
    );

    return await this.oracleWallet.signMessage(ethers.getBytes(messageHash));
  }

  /**
   * Kirim hasil penilaian ke kontrak.
   * @param {string} campaignIdStr - id campaign (string, akan di-hash)
   * @param {number} score - 0..100 dari AI evaluator
   * @param {number} nonce - nonce oracle untuk campaign ini
   */
  async submitScore(campaignIdStr, score, nonce) {
    const campaignId = ethers.id(campaignIdStr);
    const signature = await this.signScore({ campaignId, score, nonce });

    const tx = await this.escrow.oracleCallback(
      campaignId,
      score,
      nonce,
      signature
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash, score, nonce };
  }

  get oracleAddress() {
    return this.oracleWallet.address;
  }
}

module.exports = new OracleService();
