const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

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

let cachedJwks: JwksResponse | null = null;

async function fetchGoogleJwks(): Promise<JwksResponse> {
  if (cachedJwks) {
    return cachedJwks;
  }
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google JWKS: ${res.status}`);
  }
  cachedJwks = (await res.json()) as JwksResponse;
  return cachedJwks;
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

async function verifyWithJwk(
  jwk: JwksKey,
  segments: string[],
): Promise<void> {
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
    throw new Error("Google token signature verification failed");
  }
}

export async function verifyGoogleSignature(idToken: string): Promise<void> {
  const segments = idToken.split(".");
  if (segments.length !== 3) {
    throw new Error("Invalid Google id_token: expected 3 segments");
  }

  const [headerB64] = segments;
  const headerJson = new TextDecoder().decode(base64UrlToUint8Array(headerB64));
  const header = JSON.parse(headerJson) as { kid?: string; alg?: string };

  if (header.alg !== "RS256") {
    throw new Error(`Unsupported Google token algorithm: ${header.alg}`);
  }

  if (!header.kid) {
    throw new Error("Google token missing kid header");
  }

  const jwks = await fetchGoogleJwks();
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    // Key not found — clear cache and retry once (key rotation)
    cachedJwks = null;
    const refreshedJwks = await fetchGoogleJwks();
    const retryJwk = refreshedJwks.keys.find((k) => k.kid === header.kid);
    if (!retryJwk) {
      throw new Error(`Google JWKS key not found for kid: ${header.kid}`);
    }
    await verifyWithJwk(retryJwk, segments);
    return;
  }

  await verifyWithJwk(jwk, segments);
}
