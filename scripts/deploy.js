const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const baseTokenURI =
    process.env.BASE_BEGINNER_BADGE_TOKEN_URI || "ipfs://bafybeidefaultmetadata";

  const Badge = await ethers.getContractFactory("BaseBeginnerBadge");
  const badge = await Badge.deploy(baseTokenURI);

  await badge.waitForDeployment();
  const address = await badge.getAddress();
  console.log("BaseBeginnerBadge deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
