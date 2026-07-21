import { ethers } from "ethers";
import config from "../config/index.js";
import AppError from "../utils/AppError.js";
import walletService from "./walletService.js";

const XIDR_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function owner() external view returns (address)",
  // Kontrak MockXIDR.sol yang ter-deploy HANYA extends ERC20 + Ownable —
  // TIDAK ada fungsi burn(). TrustFundEscrow juga UUPS proxy yang nge-set
  // address token cuma sekali lewat initialize() tanpa setter, jadi redeploy
  // token baru dengan burn() akan memutus campaign yang sudah berjalan.
  // Solusi tanpa sentuh kontrak sama sekali: transfer ke burn address
  // standar (0x000...dEaD) — token permanen tidak bisa dipakai lagi,
  // secara efektif "hilang dari sirkulasi" walau totalSupply() tidak turun.
  "function transfer(address to, uint256 amount) external returns (bool)",
];

// Alamat burn address konvensi umum: tidak punya private key yang diketahui,
// jadi token yang ditransfer ke sini permanen tidak bisa dipindah lagi.
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

// Wallet custodial yayasan selama ini HANYA menerima token (tidak butuh gas
// untuk menerima). Begitu dia harus mengirim transaksi sendiri (transfer ke
// burn address), dia butuh saldo native POL buat bayar gas di Amoy — yang
// tidak akan pernah ada kecuali di-top-up. Angka kecil, cukup untuk beberapa
// transaksi ERC20 transfer di testnet. Pakai BigInt literal langsung (bukan
// ethers.parseEther) supaya tidak bergantung ke fungsi itu ada/tidaknya di
// lingkungan yang meng-import modul ini (mis. saat di-mock untuk testing).
const GAS_TOPUP_THRESHOLD = 5_000_000_000_000_000n; // 0.005 POL
const GAS_TOPUP_AMOUNT = 20_000_000_000_000_000n; // 0.02 POL

async function _ensureGasFunded(address) {
  const balance = await provider.getBalance(address);
  if (balance >= GAS_TOPUP_THRESHOLD) return null;
  const tx = await backendWallet.sendTransaction({
    to: address,
    value: GAS_TOPUP_AMOUNT,
  });
  const receipt = await tx.wait();
  return { txHash: receipt.hash, amount: GAS_TOPUP_AMOUNT.toString() };
}

if (!config.chain.xidrAddress) {
  throw AppError.internal();
}

const provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);
const backendWallet = new ethers.Wallet(
  config.chain.backendPrivateKey,
  provider,
);

const token = new ethers.Contract(
  config.chain.xidrAddress,
  XIDR_ABI,
  backendWallet,
);

async function owner() {
  return await token.owner();
}

async function backendIsOwner() {
  const contractOwner = await token.owner();
  return contractOwner.toLowerCase() === backendWallet.address.toLowerCase();
}

async function balanceOf(address) {
  const bal = await token.balanceOf(address);
  return bal.toString();
}

async function toUnits(humanAmount) {
  const decimals = await token.decimals();
  return ethers.parseUnits(humanAmount.toString(), decimals);
}

async function mint(toAddress, humanAmount) {
  const amount = await toUnits(humanAmount);
  const bal = await token.balanceOf(toAddress);
  if (bal < amount) {
    const batchAmount = amount + (await toUnits("10000000000")); // Mint extra 10 miliar XIDR sekaligus
    const tx = await token.mint(toAddress, batchAmount);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, amount: batchAmount.toString() };
  }
  return { txHash: "skipped", amount: amount.toString() };
}

async function approveEscrow(humanAmount) {
  const amount = await toUnits(humanAmount);
  const currentAllowance = await token.allowance(backendWallet.address, config.chain.escrowAddress);
  if (currentAllowance < amount) {
    const tx = await token.approve(config.chain.escrowAddress, ethers.MaxUint256);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, amount: ethers.MaxUint256.toString() };
  }
  return { txHash: "skipped", amount: amount.toString() };
}

/**
 * "Membakar" MockXIDR dari wallet custodial yayasan dengan mengirimnya ke
 * burn address standar (bukan memanggil fungsi burn() — MockXIDR.sol yang
 * ter-deploy tidak punya fungsi itu, lihat komentar XIDR_ABI di atas).
 * Token yang sampai di burn address permanen tidak bisa dipindah lagi,
 * jadi efeknya sama: XIDR "hilang" dari sirkulasi begitu dana dicairkan
 * kembali jadi rupiah lewat payoutService.autoDisburse().
 */
async function burnFromFoundation(foundationEncryptedKey, humanAmount) {
  if (!foundationEncryptedKey) {
    throw AppError.badRequest(
      "Wallet custodial yayasan tidak ditemukan (encryptedKey kosong).",
    );
  }
  const signer = await walletService.getSigner(foundationEncryptedKey, provider);

  await _ensureGasFunded(signer.address);

  const tokenAsFoundation = new ethers.Contract(
    config.chain.xidrAddress,
    XIDR_ABI,
    signer,
  );
  const amount = await toUnits(humanAmount);
  const tx = await tokenAsFoundation.transfer(DEAD_ADDRESS, amount);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, amount: amount.toString(), burnAddress: DEAD_ADDRESS };
}

export default {
  toUnits,
  owner,
  backendIsOwner,
  balanceOf,
  mint,
  approveEscrow,
  burnFromFoundation,
  backendWallet,
};