import { randomBytes } from "node:crypto";

interface RelayEntry {
  payload: unknown;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map<string, RelayEntry>();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(code);
    }
  }
}, 60_000);

export function storeTokens(payload: unknown): string {
  const code = randomBytes(32).toString("hex");
  store.set(code, {
    payload,
    expiresAt: Date.now() + TTL_MS,
  });
  return code;
}

export function consumeTokens(code: string): unknown | null {
  const entry = store.get(code);
  if (!entry) return null;

  store.delete(code);

  if (entry.expiresAt <= Date.now()) return null;

  return entry.payload;
}
