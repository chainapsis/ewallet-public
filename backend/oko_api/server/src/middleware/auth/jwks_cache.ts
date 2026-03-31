import { createPublicKey, type JsonWebKey } from "crypto";

interface JwkWithKid extends JsonWebKey {
  kid: string;
}

interface CacheEntry {
  fetchedAt: number;
  keys: JwkWithKid[];
}

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

export function createJwksCache(
  jwksUrl: string,
  provider: string,
  fetchInit?: RequestInit,
) {
  const cache: CacheEntry = { fetchedAt: 0, keys: [] };

  async function getSigningKey(kid: string): Promise<JwkWithKid | null> {
    const keys = await fetchJwks();
    const match = keys.find((key) => key.kid === kid);

    if (match) {
      return match;
    }

    const freshKeys = await fetchJwks({ forceRefresh: true });
    return freshKeys.find((key) => key.kid === kid) ?? null;
  }

  async function fetchJwks(
    options: { forceRefresh?: boolean } = {},
  ): Promise<JwkWithKid[]> {
    const now = Date.now();

    if (!options.forceRefresh && now - cache.fetchedAt < JWKS_CACHE_TTL_MS) {
      return cache.keys;
    }

    const response = await fetch(jwksUrl, fetchInit);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${provider} JWKS: ${response.status} ${response.statusText}`,
      );
    }

    const body = (await response.json()) as { keys?: JwkWithKid[] };

    if (!body.keys || !Array.isArray(body.keys) || body.keys.length === 0) {
      throw new Error(`${provider} JWKS response missing keys`);
    }

    cache.fetchedAt = now;
    cache.keys = body.keys;

    return body.keys;
  }

  return { getSigningKey };
}

export function jwkToPem(jwk: JsonWebKey): string {
  const publicKey = createPublicKey({
    key: jwk,
    format: "jwk",
  });

  return publicKey.export({
    type: "spki",
    format: "pem",
  }) as string;
}
