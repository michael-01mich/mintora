import { ethers } from "ethers";

const BASE_SEPOLIA_CHAIN_ID = Number(process.env.BASE_SEPOLIA_CHAIN_ID || 84532);
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BADGE_CONTRACT_ADDRESS = process.env.BASE_BEGINNER_BADGE_ADDRESS;

const badgeAbi = [
  "function mintTo(address to) public returns (uint256)",
  "function owner() view returns (address)"
];

export type MintResult =
  | { ok: true; txHash: string }
  | { ok: false; error: string };

export async function mintBaseBeginnerBadge(toAddress: string): Promise<MintResult> {
  if (!RPC_URL || !DEPLOYER_PRIVATE_KEY || !BADGE_CONTRACT_ADDRESS) {
    return { ok: false, error: "Missing RPC_URL, DEPLOYER_PRIVATE_KEY, or contract address" };
  }

  try {
    const request = new ethers.FetchRequest(RPC_URL);
    request.timeout = 45000; // increase RPC timeout to reduce request TIMEOUT errors
    const provider = new ethers.JsonRpcProvider(request, {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      name: "base-sepolia",
      batchMaxCount: 1
    });
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(BADGE_CONTRACT_ADDRESS, badgeAbi, wallet);
    const tx = await contract.mintTo(toAddress);
    const receipt = await tx.wait();
    return { ok: true, txHash: receipt?.hash || tx.hash };
  } catch (err) {
    console.error("mint failed", err);
    return { ok: false, error: (err as Error).message };
  }
}
