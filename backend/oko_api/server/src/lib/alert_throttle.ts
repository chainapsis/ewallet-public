const state = new Map<string, number>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const STALE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Returns true if the alert should be sent (first occurrence or interval elapsed).
 * Automatically records the timestamp on true.
 */
export function shouldAlert(key: string, intervalMs: number): boolean {
  const now = Date.now();
  const last = state.get(key);
  if (last === undefined || now - last >= intervalMs) {
    state.set(key, now);
    return true;
  }
  return false;
}

/**
 * Returns true if an alert was previously sent for this key.
 */
export function wasAlerted(key: string): boolean {
  return state.has(key);
}

/**
 * Removes the alert state for a key (e.g., on recovery).
 */
export function clearAlert(key: string): void {
  state.delete(key);
}

// Periodically clean up stale entries to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of state) {
    if (now - timestamp > STALE_TTL_MS) {
      state.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);
