import { ethers } from 'ethers';
import config from '../config/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const escrowAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../../abi/TrustFundEscrow.json'), 'utf8'));

const provider = new ethers.JsonRpcProvider(config.chain.rpcUrl);

const oracleKey =
  config.chain.oraclePrivateKey || config.chain.backendPrivateKey;
const oracleWallet = new ethers.Wallet(oracleKey, provider);

const backendWallet = new ethers.Wallet(
  config.chain.backendPrivateKey,
  provider
);
const escrow = new ethers.Contract(
  config.chain.escrowAddress,
  escrowAbi,
  backendWallet
);

async function signScore({ campaignId, score, nonce }) {
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  const messageHash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "bytes32", "uint8", "uint256"],
    [config.chain.escrowAddress, chainId, campaignId, score, nonce]
  );

  return await oracleWallet.signMessage(ethers.getBytes(messageHash));
};

async function submitScore(campaignIdStr, score, nonce) {
  const campaignId = ethers.id(campaignIdStr);
  const signature = await signScore({ campaignId, score, nonce });

  const tx = await escrow.oracleCallback(
    campaignId,
    score,
    nonce,
    signature
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, score, nonce };
};

async function getOracleAddress() {
  return oracleWallet.address;
};

export default { signScore, submitScore, getOracleAddress };
