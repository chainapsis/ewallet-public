interface JwksKey {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

interface JwksResponse {
  keys: JwksKey[];
}

const JWKS_TTL_MS = 10 * 60 * 1000;

interface JwksCache {
  jwks: JwksResponse | null;
  fetchedAt: number;
}

export function createJwksVerifier(jwksUrl: string, provider: string) {
  const cache: JwksCache = { jwks: null, fetchedAt: 0 };

  async function fetchJwks(): Promise<JwksResponse> {
    if (cache.jwks && Date.now() - cache.fetchedAt < JWKS_TTL_MS) {
      return cache.jwks;
    }
    const res = await fetch(jwksUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${provider} JWKS: ${res.status}`);
    }
    cache.jwks = (await res.json()) as JwksResponse;
    cache.fetchedAt = Date.now();
    return cache.jwks;
  }

  async function verifySignature(idToken: string): Promise<void> {
    const segments = idToken.split(".");
    if (segments.length !== 3) {
      throw new Error(`Invalid ${provider} id_token: expected 3 segments`);
    }

    const headerJson = new TextDecoder().decode(
      base64UrlToUint8Array(segments[0]),
    );
    const header = JSON.parse(headerJson) as { kid?: string; alg?: string };

    if (header.alg !== "RS256") {
      throw new Error(`Unsupported ${provider} token algorithm: ${header.alg}`);
    }

    if (!header.kid) {
      throw new Error(`${provider} token missing kid header`);
    }

    const jwks = await fetchJwks();
    let jwk = jwks.keys.find((k) => k.kid === header.kid);

    if (!jwk) {
      // Key not found — clear cache and retry once (key rotation)
      cache.jwks = null;
      cache.fetchedAt = 0;
      const refreshedJwks = await fetchJwks();
      jwk = refreshedJwks.keys.find((k) => k.kid === header.kid);
      if (!jwk) {
        throw new Error(
          `${provider} JWKS key not found for kid: ${header.kid}`,
        );
      }
    }

    await verifyWithJwk(jwk, segments);
  }

  return { verifySignature };
}

export function decodeJwtPayload<T>(idToken: string, provider: string): T {
  const segments = idToken.split(".");
  if (segments.length < 2) {
    throw new Error(`Invalid ${provider} id_token`);
  }

  try {
    const payloadJson = new TextDecoder().decode(
      base64UrlToUint8Array(segments[1]),
    );
    return JSON.parse(payloadJson) as T;
  } catch (error) {
    throw new Error(`Failed to decode ${provider} id_token: ${error}`);
  }
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) {
    base64 += "=".repeat(4 - pad);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyWithJwk(jwk: JwksKey, segments: string[]): Promise<void> {
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signedInput = new TextEncoder().encode(`${segments[0]}.${segments[1]}`);
  const signatureBytes = base64UrlToUint8Array(segments[2]);

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signatureBytes.buffer as ArrayBuffer,
    signedInput,
  );

  if (!valid) {
    throw new Error("Token signature verification failed");
  }
}
