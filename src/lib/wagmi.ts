import { sdk } from "@farcaster/miniapp-sdk";
import { configureChains, createConfig } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";
import { base, baseSepolia } from "wagmi/chains";

const mintMode = process.env.NEXT_PUBLIC_MINT_MODE || "backend";
const targetChainId = Number(
  process.env.NEXT_PUBLIC_TARGET_CHAIN_ID || (mintMode === "wallet" ? 8453 : 84532)
);

export const targetChain = targetChainId === base.id ? base : baseSepolia;

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [targetChain],
  [
    jsonRpcProvider({
      rpc: (chain) => {
        const rpcUrl =
          chain.rpcUrls.default.http[0] || chain.rpcUrls.public.http[0] || chain.rpcUrls.default.webSocket?.[0];
        if (!rpcUrl) return null;
        return { http: rpcUrl };
      }
    }),
    publicProvider()
  ]
);

const farcasterConnector = new InjectedConnector({
  chains,
  options: {
    name: "Farcaster Wallet",
    shimDisconnect: true,
    getProvider: () => (typeof window === "undefined" ? undefined : (sdk.wallet.ethProvider as any))
  }
});

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [farcasterConnector],
  publicClient,
  webSocketPublicClient
});
