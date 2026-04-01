import type { Result } from "@oko-wallet/stdlib-js";
import { createPublicKey, type JsonWebKey } from "crypto";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";

import type { OAuthValidationFail } from "../types";
import { GOOGLE_CLIENT_ID } from "./client_id";

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

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;
const jwksCache = new Map<string, { fetchedAt: number; keys: GoogleJwk[] }>();

export async function validateGoogleOAuthToken(
  idToken: string,
): Promise<Result<GoogleUserInfo, OAuthValidationFail>> {
  try {
    const decoded = jwt.decode(idToken, { complete: true });

    if (!decoded || typeof decoded === "string") {
      return {
        success: false,
        err: { type: "invalid_token", message: "Invalid token format" },
      };
    }

    const header = decoded.header as JwtHeader;

    if (!header.kid) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Missing key id in token header",
        },
      };
    }

    const jwk = await getSigningKey(header.kid);

    if (!jwk) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Unable to find signing key for token",
        },
      };
    }

    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    const pem = publicKey.export({ type: "spki", format: "pem" }) as string;

    const payload = jwt.verify(idToken, pem, {
      algorithms: ["RS256"],
      audience: GOOGLE_CLIENT_ID,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    }) as GoogleIdTokenPayload;

    if (!payload.sub) {
      return {
        success: false,
        err: { type: "invalid_token", message: "Token missing subject claim" },
      };
    }

    if (!payload.email) {
      return {
        success: false,
        err: { type: "invalid_token", message: "Token missing email claim" },
      };
    }

    if (!payload.email_verified) {
      return {
        success: false,
        err: {
          type: "email_not_verified",
          message: "Email address is not verified",
        },
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
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        err: { type: "token_expired", message: "Token has expired" },
      };
    }

    const message =
      error instanceof Error ? error.message : "Google token validation failed";
    return {
      success: false,
      err: { type: "invalid_token", message },
    };
  }
}

async function getSigningKey(kid: string): Promise<GoogleJwk | null> {
  const keys = await fetchJwks();
  const match = keys.find((k) => k.kid === kid);
  if (match) {
    return match;
  }

  const freshKeys = await fetchJwks({ forceRefresh: true });
  return freshKeys.find((k) => k.kid === kid) ?? null;
}

async function fetchJwks(
  options: { forceRefresh?: boolean } = {},
): Promise<GoogleJwk[]> {
  const cached = jwksCache.get(GOOGLE_JWKS_URL);
  const now = Date.now();

  if (
    !options.forceRefresh &&
    cached &&
    now - cached.fetchedAt < JWKS_CACHE_TTL_MS
  ) {
    return cached.keys;
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

  jwksCache.set(GOOGLE_JWKS_URL, { fetchedAt: now, keys: body.keys });

  return body.keys;
}
