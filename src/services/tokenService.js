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
  
  
  
  
  
  
  
  "function transfer(address to, uint256 amount) external returns (bool)",
];



const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";








const GAS_TOPUP_THRESHOLD = 5_000_000_000_000_000n; 
const GAS_TOPUP_AMOUNT = 20_000_000_000_000_000n; 

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
    const batchAmount = amount + (await toUnits("10000000000")); 
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