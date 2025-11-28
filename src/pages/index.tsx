import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import type { ProgressState } from "../lib/progressStore";
import { sdk } from "@farcaster/miniapp-sdk";
import { ethers } from "ethers";
import { useAccount, useConnect, useSwitchNetwork, useWalletClient } from "wagmi";
import { targetChain } from "../lib/wagmi";

type ApiStateResponse = {
  userId: string;
  signerAddress?: string;
  progress: { state: ProgressState };
};

const quizOptions = ["Bitcoin", "Solana", "Ethereum", "Tron"];
const mintMode = process.env.NEXT_PUBLIC_MINT_MODE || "backend"; // "backend" uses server minter (sepolia), "wallet" uses user wallet (mainnet)
const badgeAddress = process.env.NEXT_PUBLIC_BADGE_ADDRESS;
const targetChainId = targetChain.id;

const badgeAbi = ["function mint() public returns (uint256)"];
const farcasterMiniAppPayload = {
  version: "1",
  imageUrl: "https://mintora-dusky.vercel.app/opengraph-image.png",
  button: {
    title: "Open Mintora",
    action: {
      type: "launch_miniapp",
      url: "https://mintora-dusky.vercel.app/",
      name: "Mintora",
      splashImageUrl: "https://mintora-dusky.vercel.app/icon.png",
      splashBackgroundColor: "#0b0b1f"
    }
  }
}; // Canonical Farcaster Mini App embed payload for the root URL
const farcasterMiniAppEmbed = JSON.stringify(farcasterMiniAppPayload); // Stringified embed for fc:miniapp
const farcasterFrameEmbed = JSON.stringify({
  ...farcasterMiniAppPayload,
  button: {
    ...farcasterMiniAppPayload.button,
    action: { ...farcasterMiniAppPayload.button.action, type: "launch_frame" }
  }
}); // Backward-compatible Frame embed payload with launch_frame action

export default function Home() {
  const [progress, setProgress] = useState<ProgressState>("NOT_STARTED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [retry, setRetry] = useState(false);
  const [farcasterSigner, setFarcasterSigner] = useState<string | null>(null);
  const autoConnectAttempted = useRef(false);
  const addPromptShown = useRef(false);

  const { address, isConnecting: isAccountConnecting } = useAccount();
  const { connectAsync, connectors, isLoading: isConnectingWallet } = useConnect();
  const { data: walletClient } = useWalletClient();
  const { switchNetworkAsync } = useSwitchNetwork();

  const farcasterConnector = useMemo(
    () => connectors.find((c) => c.id === "injected") || connectors[0],
    [connectors]
  );
  const primaryAddress = address || farcasterSigner;
  const isBusyConnecting = isAccountConnecting || isConnectingWallet;

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      const data = (await res.json()) as ApiStateResponse;
      setProgress(data.progress.state);
      if (data.signerAddress) {
        setFarcasterSigner(data.signerAddress);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load state");
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  useEffect(() => {
    const promptAddMiniApp = async () => {
      if (addPromptShown.current) return;
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (!inMiniApp) return;
        addPromptShown.current = true;
        await sdk.actions.addMiniApp();
      } catch (err) {
        console.warn("Add Mini App prompt skipped", err);
      }
    };
    promptAddMiniApp();
  }, []);

  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (autoConnectAttempted.current) return;
      if (!farcasterConnector?.ready) return;
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (!inMiniApp) return;
        autoConnectAttempted.current = true;
        await connectAsync({ connector: farcasterConnector, chainId: targetChainId });
      } catch (err) {
        console.warn("Auto-connect skipped", err);
      }
    };
    attemptAutoConnect();
  }, [connectAsync, farcasterConnector]);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/intro", { method: "POST" });
    const data = await res.json();
    if (data?.progress?.state) setProgress(data.progress.state);
    setLoading(false);
  };

  const handleAnswer = async (answer: string) => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer })
    });
    const data = await res.json();
    if (data.correct) {
      setProgress(data.progress.state);
      setRetry(false);
    } else {
      setRetry(true);
    }
    setLoading(false);
  };

  const handleConnectWallet = async () => {
    setError(null);
    const connector = farcasterConnector;
    if (!connector) {
      setError("Farcaster wallet not available.");
      return;
    }
    try {
      await connectAsync({ connector, chainId: targetChainId });
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Unable to connect wallet. Try again.");
    }
  };

  const handleMint = async () => {
    if (mintMode === "wallet") {
      return handleMintWithWallet();
    }
    return handleMintWithBackend();
  };

  const handleMintWithBackend = async () => {
    if (!primaryAddress) {
      setError("Connect a wallet first.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/mint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: primaryAddress })
    });
    const data = await res.json();
    if (data.ok) {
      setProgress(data.progress.state);
      setTxHash(data.txHash);
    } else {
      setError(data.error || "Mint failed");
    }
    setLoading(false);
  };

  const handleMintWithWallet = async () => {
    if (!address) {
      setError("Connect a wallet first.");
      return;
    }
    if (!badgeAddress) {
      setError("Badge contract address is missing.");
      return;
    }
    if (!walletClient) {
      setError("Wallet client is not ready yet.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const iface = new ethers.Interface(badgeAbi);
      const data = iface.encodeFunctionData("mint");
      if (walletClient.chain?.id !== targetChainId) {
        if (switchNetworkAsync) {
          await switchNetworkAsync(targetChainId);
        } else {
          throw new Error(`Switch to ${targetChain.name} to mint.`);
        }
      }
      const hash = await walletClient.sendTransaction({
        to: badgeAddress as `0x${string}`,
        data: data as `0x${string}`,
        value: 0n,
        account: address as `0x${string}`,
        chain: targetChain
      });
      await markProgressAsMinted(hash);
      setTxHash(hash || null);
      setProgress("NFT_MINTED");
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Mint failed");
    }
    setLoading(false);
  };

  const markProgressAsMinted = async (clientTxHash?: string) => {
    try {
      await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientTxHash })
      });
    } catch (err) {
      console.warn("Unable to mark progress minted", err);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/reset", { method: "POST" });
    const data = await res.json();
    setProgress(data.progress.state);
    setTxHash(null);
    setRetry(false);
    setLoading(false);
  };

  const shareUrl = useMemo(() => {
    const appUrl = process.env.NEXT_PUBLIC_FARCASTER_APP_URL || "";
    const text = encodeURIComponent("I just earned the Base Beginner Badge on Base Sepolia!");
    const embed = appUrl ? `&embeds[]=${encodeURIComponent(appUrl)}` : "";
    return `https://warpcast.com/~/compose?text=${text}${embed}`;
  }, []);

  const explorerUrl = useMemo(() => {
    if (!txHash) return undefined;
    const baseUrl = targetChainId === 8453 ? "https://basescan.org/tx/" : "https://sepolia.basescan.org/tx/";
    return `${baseUrl}${txHash}`;
  }, [txHash, targetChainId]);

  const renderIntro = () => (
    <section>
      <div className="eyebrow">Step 1 · Intro</div>
      <h1>Welcome to Base</h1>
      <p>
        Base is a fast, secure Ethereum Layer 2 built by Coinbase.
        <br />
        It lets you mint NFTs, trade assets, and use apps instantly and cheaply.
      </p>
      <button onClick={handleContinue} disabled={loading}>
        {loading ? "Loading..." : "Continue"}
      </button>
    </section>
  );

  const renderQuiz = () => {
    if (retry) {
      return (
        <section>
          <div className="eyebrow">Step 2 · Quiz</div>
          <h2>Not quite. Try again.</h2>
          <button onClick={() => setRetry(false)} disabled={loading}>
            Try Again
          </button>
        </section>
      );
    }
    return (
      <section>
        <div className="eyebrow">Step 2 · Quiz</div>
        <h2>Base is built on which blockchain?</h2>
        <div className="grid">
          {quizOptions.map((opt) => (
            <button key={opt} onClick={() => handleAnswer(opt)} disabled={loading}>
              {opt}
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderMint = () => (
    <section>
      <div className="eyebrow">Step 3 · Mint</div>
      <h2>You Completed the Base Onboarding Journey!</h2>
      <p>Mint your official Base Beginner Badge to commemorate your first step into Base.</p>
      {!primaryAddress && (
        <div className="banner">
          <div>
            <strong>Connect wallet</strong>
            <div className="muted">Use the Farcaster wallet connection to receive the badge.</div>
          </div>
          <button className="ghost" onClick={handleConnectWallet} disabled={isBusyConnecting}>
            {isBusyConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      )}
      <button onClick={handleMint} disabled={loading || !primaryAddress}>
        {loading ? "Minting..." : primaryAddress ? "Mint NFT" : "Connect wallet to mint"}
      </button>
      {txHash && (
        <p className="muted">
          Tx:{" "}
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            {txHash.slice(0, 12)}...
          </a>
        </p>
      )}
    </section>
  );

  const renderSuccess = () => (
    <section>
      <div className="eyebrow">All done</div>
      <h2>Mint Successful!</h2>
      <div className="actions">
        <a className="linklike" href={shareUrl} target="_blank" rel="noreferrer noopener">
          Share on Farcaster
        </a>
        {explorerUrl && (
          <a className="linklike" href={explorerUrl} target="_blank" rel="noreferrer noopener">
            View NFT
          </a>
        )}
        <button onClick={handleReset}>Start Over</button>
      </div>
      {txHash && (
        <p className="muted">
          Tx hash:{" "}
          {explorerUrl ? (
            <a href={explorerUrl} target="_blank" rel="noreferrer noopener">
              {txHash}
            </a>
          ) : (
            txHash
          )}
        </p>
      )}
    </section>
  );

  const renderStep = () => {
    switch (progress) {
      case "NOT_STARTED":
        return renderIntro();
      case "INTRO_COMPLETED":
        return renderQuiz();
      case "QUIZ_PASSED":
        return renderMint();
      case "NFT_MINTED":
        return renderSuccess();
      default:
        return renderIntro();
    }
  };

  return (
    <>
      <Head>
        <title>Base Beginner Journey</title>
        <meta name="description" content="Complete the Base onboarding path and mint your Base Beginner Badge." />
        <link rel="canonical" href="https://mintora-dusky.vercel.app" />
        <link rel="alternate" type="application/json" href="https://mintora-dusky.vercel.app/.well-known/farcaster.json" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Base Beginner Journey" />
        <meta property="og:title" content="Base Beginner Journey" />
        <meta
          property="og:description"
          content="Interactive Base onboarding with a quiz and an onchain Base Beginner Badge mint."
        />
        <meta property="og:image" content="https://mintora-dusky.vercel.app/og.png" />
        <meta property="og:url" content="https://mintora-dusky.vercel.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@base" />
        <meta name="twitter:title" content="Base Beginner Journey" />
        <meta
          name="twitter:description"
          content="Interactive Base onboarding with a quiz and an onchain Base Beginner Badge mint."
        />
        <meta name="twitter:image" content="https://mintora-dusky.vercel.app/og.png" />
        <meta name="fc:miniapp" content={farcasterMiniAppEmbed} />{/* Farcaster Mini App embed tag */}
        <meta name="fc:frame" content={farcasterFrameEmbed} />{/* Backward-compatible Frame embed tag */}
      </Head>
      <main>
        <header>
          <div className="title">
            <span className="badge">Base Beginner Journey</span>
          </div>
          <div className="wallet">
            {primaryAddress && (
              <span className="connected">
                Wallet: {primaryAddress.slice(0, 6)}...{primaryAddress.slice(-4)}
              </span>
            )}
            <button className="ghost" onClick={handleConnectWallet} disabled={isBusyConnecting}>
              {isBusyConnecting ? "Connecting..." : primaryAddress ? "Reconnect" : "Connect Wallet"}
            </button>
          </div>
        </header>
        {error && <p className="error">{error}</p>}
        {renderStep()}
      </main>
      <style jsx>{`
        main {
          min-height: 100vh;
          font-family: "Space Grotesk", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 32px 24px 48px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 780px;
          margin: 0 auto;
          color: #0b1b2b;
          background: radial-gradient(circle at 20% 20%, rgba(0, 110, 255, 0.08), transparent 30%),
            radial-gradient(circle at 80% 0%, rgba(74, 0, 255, 0.08), transparent 28%),
            #f6f8ff;
        }
        section {
          background: linear-gradient(180deg, #f0f6ff 0%, #ffffff 100%);
          border: 1px solid #d3ddf3;
          border-radius: 18px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 16px 40px rgba(0, 76, 255, 0.12);
        }
        h1,
        h2 {
          margin: 0;
          letter-spacing: -0.02em;
        }
        p {
          margin: 0;
          line-height: 1.5;
          color: #1b3550;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        }
        button {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #0f4cfa;
          background: linear-gradient(135deg, #0f4cfa 0%, #0b84ff 100%);
          color: #f9fbff;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.05s ease, box-shadow 0.1s ease, background 0.2s ease;
          box-shadow: 0 10px 28px rgba(15, 76, 250, 0.35);
        }
        button:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #0d45e0 0%, #0a76e0 100%);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .ghost {
          background: transparent;
          color: #0f4cfa;
          border: 1px solid rgba(15, 76, 250, 0.35);
          box-shadow: none;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .badge {
          background: #0f4cfa;
          color: #f9fbff;
          padding: 6px 12px;
          border-radius: 12px;
          font-weight: 700;
          letter-spacing: 0.01em;
          box-shadow: 0 8px 18px rgba(15, 76, 250, 0.3);
        }
        .user {
          color: #4a6b8a;
          font-size: 14px;
        }
        .muted {
          color: #4a6b8a;
          font-size: 14px;
        }
        .error {
          color: #b00020;
          background: #ffeef1;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #ffc7d0;
        }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .linklike {
          display: inline-block;
          text-align: center;
          text-decoration: none;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #0f4cfa;
          background: linear-gradient(135deg, #0f4cfa 0%, #0b84ff 100%);
          color: #f9fbff;
          font-weight: 600;
          box-shadow: 0 10px 28px rgba(15, 76, 250, 0.35);
          transition: transform 0.05s ease, box-shadow 0.1s ease, background 0.2s ease;
        }
        .linklike:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #0d45e0 0%, #0a76e0 100%);
        }
        .wallet {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .connected {
          font-size: 14px;
          color: #0b1b2b;
          background: #e8f1ff;
          padding: 6px 10px;
          border-radius: 10px;
          border: 1px solid rgba(15, 76, 250, 0.2);
        }
        .title {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 12px;
          color: #0f4cfa;
          font-weight: 700;
        }
        .banner {
          border: 1px dashed rgba(15, 76, 250, 0.5);
          background: #eef4ff;
          padding: 12px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          main {
            padding: 18px;
          }
          button {
            width: 100%;
          }
          header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}
