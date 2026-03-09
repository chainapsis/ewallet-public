/**
 * Stores OAuth tokens in the proxy's server-side relay store
 * and returns a single-use retrieval code.
 *
 * Used by callback pages in the mobile flow so that raw tokens
 * never appear in deep link URLs or pass through the mobile app.
 */
export async function storeOAuthRelay(payload: unknown): Promise<string> {
  const res = await fetch("/api/mobile/oauth-store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  if (!res.ok) {
    throw new Error(`Failed to store OAuth relay: ${res.status}`);
  }

  const data = (await res.json()) as { success: boolean; code?: string };
  if (!data.success || !data.code) {
    throw new Error("Invalid relay store response");
  }

  return data.code;
}
