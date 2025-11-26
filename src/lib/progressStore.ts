export type ProgressState = "NOT_STARTED" | "INTRO_COMPLETED" | "QUIZ_PASSED" | "NFT_MINTED";

type ProgressRecord = {
  state: ProgressState;
  lastUpdated: number;
};

// In-memory store keyed by Farcaster user id or signer address.
// Replace with a persistent datastore (e.g., Redis/Postgres) for production.
const store = new Map<string, ProgressRecord>();

export function getProgress(userId: string): ProgressRecord {
  const existing = store.get(userId);
  if (existing) return existing;
  const fresh: ProgressRecord = { state: "NOT_STARTED", lastUpdated: Date.now() };
  store.set(userId, fresh);
  return fresh;
}

export function setProgress(userId: string, state: ProgressState): ProgressRecord {
  const record: ProgressRecord = { state, lastUpdated: Date.now() };
  store.set(userId, record);
  return record;
}

export function resetProgress(userId: string): ProgressRecord {
  const record: ProgressRecord = { state: "NOT_STARTED", lastUpdated: Date.now() };
  store.set(userId, record);
  return record;
}
