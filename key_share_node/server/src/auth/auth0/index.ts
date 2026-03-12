import type { Result } from "@oko-wallet/stdlib-js";
import { createPublicKey, type JsonWebKey } from "crypto";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";

import type { OAuthValidationFail } from "../types";
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "./client_id";

interface Auth0IdTokenPayload extends JwtPayload {
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

export interface Auth0TokenInfo {
  email: string;
  name?: string;
  sub: string;
}

interface Auth0Jwk extends JsonWebKey {
  kid: string;
}

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const jwksCache = new Map<
  string,
  {
    fetchedAt: number;
    keys: Auth0Jwk[];
  }
>();

export async function validateAuth0Token(
  idToken: string,
): Promise<Result<Auth0TokenInfo, OAuthValidationFail>> {
  try {
    const decoded = jwt.decode(idToken, { complete: true });

    if (!decoded || typeof decoded === "string") {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Invalid token format",
        },
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

    const jwk = await getSigningKey(AUTH0_DOMAIN, header.kid);

    if (!jwk) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Unable to find signing key for token",
        },
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
      audience: AUTH0_CLIENT_ID,
      issuer: `https://${AUTH0_DOMAIN}/`,
    }) as Auth0IdTokenPayload;

    if (!payload.sub) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Token missing subject claim",
        },
      };
    }

    if (!payload.email) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Token missing email claim",
        },
      };
    }

    const emailVerified =
      payload.email_verified === true || payload.email_verified === "true";

    if (!emailVerified) {
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
        name: typeof payload.name === "string" ? payload.name : undefined,
        sub: payload.sub,
      },
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        err: {
          type: "token_expired",
          message: "Token has expired",
        },
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: error.message,
        },
      };
    }

    return {
      success: false,
      err: {
        type: "unknown",
        message: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

async function getSigningKey(
  domain: string,
  kid: string,
): Promise<Auth0Jwk | null> {
  const keys = await getJwks(domain);
  const match = keys.find((key) => key.kid === kid);

  if (match) {
    return match;
  }

  const freshKeys = await getJwks(domain, { forceRefresh: true });
  return freshKeys.find((key) => key.kid === kid) ?? null;
}

async function getJwks(
  domain: string,
  options: { forceRefresh?: boolean } = {},
): Promise<Auth0Jwk[]> {
  const cacheKey = domain;
  const cached = jwksCache.get(cacheKey);
  const now = Date.now();

  if (
    !options.forceRefresh &&
    cached &&
    now - cached.fetchedAt < JWKS_CACHE_TTL_MS
  ) {
    return cached.keys;
  }

  const response = await fetch(`https://${domain}/.well-known/jwks.json`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Auth0 JWKS: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as { keys?: Auth0Jwk[] };

  const keys = body.keys ?? [];
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error("Auth0 JWKS response missing keys");
  }

  jwksCache.set(cacheKey, {
    fetchedAt: now,
    keys,
  });

  return keys;
}
