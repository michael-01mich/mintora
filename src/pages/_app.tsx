import type { AppProps } from "next/app";
import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { WagmiConfig } from "wagmi";
import { wagmiConfig } from "../lib/wagmi";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    sdk.actions.ready().catch(() => {
      // Best-effort: outside the Farcaster host this can fail silently.
    });
  }, []);

  return (
    <WagmiConfig config={wagmiConfig}>
      <Component {...pageProps} />
    </WagmiConfig>
  );
}
