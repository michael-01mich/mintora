import type { NextApiRequest, NextApiResponse } from "next";
import { getMiniAppUser } from "../../lib/farcaster";
import { setProgress } from "../../lib/progressStore";
import { mintBaseBeginnerBadge } from "../../lib/mint";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { userId, signerAddress } = getMiniAppUser(req);
  const toAddress = signerAddress || (req.body?.address as string | undefined);
  const clientTxHash = req.body?.clientTxHash as string | undefined;

  if (clientTxHash) {
    const progress = setProgress(userId, "NFT_MINTED");
    res.status(200).json({ ok: true, txHash: clientTxHash, progress, mode: "client" });
    return;
  }

  if (!toAddress) {
    res.status(400).json({ ok: false, error: "Missing signer address in Farcaster context" });
    return;
  }

  const result = await mintBaseBeginnerBadge(toAddress);
  if (!result.ok) {
    res.status(500).json(result);
    return;
  }

  const progress = setProgress(userId, "NFT_MINTED");
  res.status(200).json({ ok: true, txHash: result.txHash, progress });
}
