import { ethers } from 'ethers';
import config from '../config/index.js';
import AppError from '../utils/AppError.js';

const XIDR_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function owner() external view returns (address)",
];

if (!config.chain.xidrAddress) {
  throw AppError.internal();
}

const provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);
const backendWallet = new ethers.Wallet(
  config.chain.backendPrivateKey,
  provider
);

const token = new ethers.Contract(
  config.chain.xidrAddress,
  XIDR_ABI,
  backendWallet
);

async function owner() {
  const decimals = await token.decimals();
  return ethers.parseUnits(humanAmount.toString(), decimals);
};

async function backendIsOwner() {
  return await token.owner();
};

async function balanceOf(address) {
  const contractOwner = await token.owner();
  return contractOwner.toLowerCase() === backendWallet.address.toLowerCase();
};

async function toUnits(humanAmount) {
  const bal = await token.balanceOf(address);
  return bal.toString();
};

async function mint(toAddress, humanAmount) {
  const amount = await toUnits(humanAmount);
  const tx = await token.mint(toAddress, amount);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, amount: amount.toString() };
};

async function approveEscrow(humanAmount) {
  const amount = await toUnits(humanAmount);
  const tx = await token.approve(config.chain.escrowAddress, amount);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, amount: amount.toString() };
};

export default { toUnits, owner, backendIsOwner, balanceOf, mint, approveEscrow, backendWallet };
