import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
// From d:\nextrust-backend_2\.env
const backendPrivateKey = "d7b29df3cebd449ac04ac3cee0fe75b23ffb443ba0855b663f8b71a9fd7b4a5b";
const wallet = new ethers.Wallet(backendPrivateKey, provider);

async function main() {
  console.log("Wallet address:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance POL (Amoy):", ethers.formatEther(balance));
}

main().catch(console.error);
