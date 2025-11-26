require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const BASE_SEPOLIA_CHAIN_ID = Number(process.env.BASE_SEPOLIA_CHAIN_ID || 84532);
const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL || "";
const BASE_MAINNET_CHAIN_ID = Number(process.env.BASE_MAINNET_CHAIN_ID || 8453);

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: "0.8.23",
  networks: {
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL || undefined,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: BASE_SEPOLIA_CHAIN_ID
    },
    baseMainnet: {
      url: BASE_MAINNET_RPC_URL || undefined,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: BASE_MAINNET_CHAIN_ID
    }
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: BASE_SEPOLIA_CHAIN_ID,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};

module.exports = config;
