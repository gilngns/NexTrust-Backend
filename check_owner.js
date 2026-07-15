import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
const backendWallet = new ethers.Wallet("d7b29df3cebd449ac04ac3cee0fe75b23ffb443ba0855b663f8b71a9fd7b4a5b", provider);

const XIDR_ABI = [
  "function owner() external view returns (address)"
];
const token = new ethers.Contract("0x3C1a391628A6805E8158C6ed747b640812E97eb6", XIDR_ABI, provider);

async function main() {
  const contractOwner = await token.owner();
  console.log("MockXIDR Owner:", contractOwner);
  console.log("Backend Wallet:", backendWallet.address);
  console.log("Is Owner?", contractOwner.toLowerCase() === backendWallet.address.toLowerCase());
}

main().catch(console.error);
