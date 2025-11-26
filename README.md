# Base Beginner Journey Mini App

Farcaster Mini App onboarding flow that teaches Base basics, quizzes the user, and mints a Base Beginner Badge NFT on Base Sepolia.

## Structure
- `contracts/BaseBeginnerBadge.sol` — ERC721 badge with `mintTo` restricted to owner.
- `scripts/deploy.ts` — Deploys the badge contract (Base Sepolia).
- `src/lib/progressStore.ts` — In-memory user progress store (swap for DB in production).
- `src/lib/mint.ts` — Backend helper to mint via ethers.
- `src/lib/farcaster.ts` — Extracts user/signer context from Farcaster Mini App requests.
- `src/pages/api/*` — Mini App API routes: state, intro, quiz, mint, reset.
- `src/pages/index.tsx` — Frontend Mini App UI using `@farcaster/miniapp-sdk`.

## Env
Copy `.env.example` to `.env` and fill:
- `BASE_SEPOLIA_RPC_URL`, `BASE_SEPOLIA_CHAIN_ID=84532`, `DEPLOYER_PRIVATE_KEY`
- `BASE_BEGINNER_BADGE_ADDRESS` (after deploy), optional `BASE_BEGINNER_BADGE_TOKEN_URI`
- `BASE_MAINNET_RPC_URL`, `BASE_MAINNET_CHAIN_ID=8453`, `BASE_MAINNET_BADGE_ADDRESS` (after mainnet deploy)
- `FARCASTER_APP_URL`, `FARCASTER_APP_NAME`, `FARCASTER_APP_ICON_URL`, `FARCASTER_CLIENT_ID`
- `NEXT_PUBLIC_FARCASTER_APP_URL`, `NEXT_PUBLIC_MOCK_USER_ID`
- `NEXT_PUBLIC_MINT_MODE`: `backend` (server mints; good for Sepolia) or `wallet` (user signs/pays gas; use for Base mainnet)
- `NEXT_PUBLIC_BADGE_ADDRESS`: badge contract to target when `wallet` mode is used
- `NEXT_PUBLIC_TARGET_CHAIN_ID`: `84532` (Sepolia) or `8453` (mainnet) to guide wallet chain switching

## Install & Run
```bash
npm install
npm run dev
```

## Deploy contract (Base Sepolia)
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```
Set `BASE_BEGINNER_BADGE_ADDRESS` in `.env` to the deployed address.

## Base mainnet flow (wallet pays gas)
- Deploy the updated badge contract to Base mainnet (`npx hardhat run scripts/deploy.js --network baseMainnet`) and set `BASE_MAINNET_BADGE_ADDRESS` + `NEXT_PUBLIC_BADGE_ADDRESS` to that address.
- Set `NEXT_PUBLIC_MINT_MODE=wallet` and `NEXT_PUBLIC_TARGET_CHAIN_ID=8453`. Users connect via Farcaster wallet; mint calls `mint()` on the badge and the user pays gas.
- Backend still tracks progress; when the client submits `clientTxHash` it marks `NFT_MINTED` without re-sending the transaction.

## Notes
- Progress is held in memory per process; replace with persistent storage for production.
- Quiz validation is server-side; minting requires Farcaster signer address from request context or `?signer=0x...` when testing locally.
