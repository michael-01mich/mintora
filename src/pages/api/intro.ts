import type { NextApiRequest, NextApiResponse } from "next";
import { getMiniAppUser } from "../../lib/farcaster";
import { setProgress } from "../../lib/progressStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { userId } = getMiniAppUser(req);
  const progress = setProgress(userId, "INTRO_COMPLETED");
  res.status(200).json({ progress });
}
