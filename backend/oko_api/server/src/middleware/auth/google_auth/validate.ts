import type { Result } from "@oko-wallet/stdlib-js";
import { createPublicKey, type JsonWebKey } from "crypto";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

interface GoogleIdTokenPayload extends JwtPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export interface GoogleUserInfo {
  email: string;
  sub: string;
  name?: string;
}

interface GoogleJwk extends JsonWebKey {
  kid: string;
}

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;
const jwksCache = {
  fetchedAt: 0,
  keys: [] as GoogleJwk[],
};

export async function validateOAuthToken(
  idToken: string,
  googleClientId: string,
): Promise<Result<GoogleUserInfo, string>> {
  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === "string") {
      return {
        success: false,
        err: "Invalid token format",
      };
    }

    const header = decoded.header as JwtHeader;
    if (!header.kid) {
      return {
        success: false,
        err: "Missing key id in token header",
      };
    }

    const jwk = await getSigningKey(header.kid);
    if (!jwk) {
      return {
        success: false,
        err: "Unable to find matching signing key for token",
      };
    }

    const publicKey = createPublicKey({
      key: jwk,
      format: "jwk",
    });

    const pem = publicKey.export({
      type: "spki",
      format: "pem",
    }) as string;

    const payload = jwt.verify(idToken, pem, {
      algorithms: ["RS256"],
      audience: googleClientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    }) as GoogleIdTokenPayload;

    if (!payload.sub) {
      return {
        success: false,
        err: "Token missing subject claim",
      };
    }

    if (!payload.email) {
      return {
        success: false,
        err: "Token missing email claim",
      };
    }

    if (!payload.email_verified) {
      return {
        success: false,
        err: "Email not verified",
      };
    }

    return {
      success: true,
      data: {
        email: payload.email,
        sub: payload.sub,
        name: typeof payload.name === "string" ? payload.name : undefined,
      },
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        err: `Invalid Google token: ${error.message}`,
      };
    }

    return {
      success: false,
      err: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function getSigningKey(kid: string): Promise<GoogleJwk | null> {
  const keys = await getJwks();
  const match = keys.find((key) => key.kid === kid);

  if (match) {
    return match;
  }

  const freshKeys = await getJwks({ forceRefresh: true });
  return freshKeys.find((key) => key.kid === kid) ?? null;
}

async function getJwks(
  options: { forceRefresh?: boolean } = {},
): Promise<GoogleJwk[]> {
  const now = Date.now();

  if (
    !options.forceRefresh &&
    jwksCache &&
    now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS
  ) {
    return jwksCache.keys;
  }

  const response = await fetch(GOOGLE_JWKS_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Google JWKS: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as { keys?: GoogleJwk[] };

  if (!body.keys || !Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("Google JWKS response missing keys");
  }

  jwksCache.fetchedAt = now;
  jwksCache.keys = body.keys;

  return body.keys;
}
