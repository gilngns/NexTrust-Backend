const { ethers } = require("ethers");
const config = require("../config");

const XIDR_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function owner() external view returns (address)",
];

/**
 * TokenService — mengelola MockXIDR untuk simulasi dana donasi.
 *
 * Di testnet, backend me-mint MockXIDR untuk mensimulasikan pembayaran QRIS
 * yang sudah masuk, lalu meng-approve dan menyetorkannya ke escrow.
 */
class TokenService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);
    this.backendWallet = new ethers.Wallet(
      config.chain.backendPrivateKey,
      this.provider
    );

    if (!config.chain.xidrAddress) {
      throw new Error("XIDR_ADDRESS belum diset di .env");
    }
    this.token = new ethers.Contract(
      config.chain.xidrAddress,
      XIDR_ABI,
      this.backendWallet
    );
  }

  /** Konversi jumlah manusiawi (mis. 1000) ke satuan token (6 desimal). */
  async toUnits(humanAmount) {
    const decimals = await this.token.decimals();
    return ethers.parseUnits(humanAmount.toString(), decimals);
  }

  /** Siapa owner token — untuk memastikan backend boleh mint. */
  async owner() {
    return await this.token.owner();
  }

  /** Apakah wallet backend adalah owner (boleh mint). */
  async backendIsOwner() {
    const owner = await this.token.owner();
    return owner.toLowerCase() === this.backendWallet.address.toLowerCase();
  }

  async balanceOf(address) {
    const bal = await this.token.balanceOf(address);
    return bal.toString();
  }

  /** Mint sejumlah token ke sebuah alamat (butuh owner). */
  async mint(toAddress, humanAmount) {
    const amount = await this.toUnits(humanAmount);
    const tx = await this.token.mint(toAddress, amount);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, amount: amount.toString() };
  }

  /** Approve escrow agar bisa menarik token dari wallet backend. */
  async approveEscrow(humanAmount) {
    const amount = await this.toUnits(humanAmount);
    const tx = await this.token.approve(config.chain.escrowAddress, amount);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, amount: amount.toString() };
  }
}

module.exports = new TokenService();
