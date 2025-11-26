import type { NextApiRequest, NextApiResponse } from "next";
import { getMiniAppUser } from "../../lib/farcaster";
import { setProgress } from "../../lib/progressStore";

const correctAnswer = "Ethereum";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { userId } = getMiniAppUser(req);
  const { answer } = req.body as { answer?: string };

  if (answer !== correctAnswer) {
    res.status(200).json({ correct: false });
    return;
  }

  const progress = setProgress(userId, "QUIZ_PASSED");
  res.status(200).json({ correct: true, progress });
}
