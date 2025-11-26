import type { NextApiRequest, NextApiResponse } from "next";
import { getMiniAppUser } from "../../lib/farcaster";
import { getProgress } from "../../lib/progressStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, signerAddress } = getMiniAppUser(req);
  const progress = getProgress(userId);

  res.status(200).json({
    userId,
    signerAddress,
    progress
  });
}
