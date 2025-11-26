import { NextApiRequest } from "next";

export type MiniAppUserContext = {
  userId: string;
  signerAddress?: string;
};

/**
 * Derives user identity from Farcaster Mini App request context.
 * For local dev we allow ?user=... or NEXT_PUBLIC_MOCK_USER_ID fallback.
 */
export function getMiniAppUser(req: NextApiRequest): MiniAppUserContext {
  const headerUser = req.headers["x-fc-user"] || req.headers["x-farcaster-user"];
  const queryUser = typeof req.query.user === "string" ? req.query.user : undefined;
  const userId =
    (Array.isArray(headerUser) ? headerUser[0] : headerUser) ||
    queryUser ||
    process.env.NEXT_PUBLIC_MOCK_USER_ID ||
    "local-dev-user";

  const signerHeader = req.headers["x-fc-signer"] || req.headers["x-farcaster-signer"];
  const signerAddress =
    (Array.isArray(signerHeader) ? signerHeader[0] : signerHeader) ||
    (typeof req.query.signer === "string" ? req.query.signer : undefined);

  return { userId: String(userId), signerAddress: signerAddress ? String(signerAddress) : undefined };
}
