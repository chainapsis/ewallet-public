import type { Result } from "@oko-wallet/stdlib-js";
import { createPublicKey, type JsonWebKey } from "crypto";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";

interface Auth0IdTokenPayload extends JwtPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
  nonce?: string;
}

interface ValidateAuth0IdTokenArgs {
  idToken: string;
  clientId: string;
  domain: string;
  expectedEmail?: string;
  expectedNonce?: string;
}

export interface Auth0UserInfo {
  email: string;
  name?: string;
  sub: string;
  nonce?: string;
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

export async function validateAuth0IdToken(
  args: ValidateAuth0IdTokenArgs,
): Promise<Result<Auth0UserInfo, string>> {
  try {
    const decoded = jwt.decode(args.idToken, { complete: true });
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

    const jwk = await getSigningKey(args.domain, header.kid);
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

    const payload = jwt.verify(args.idToken, pem, {
      algorithms: ["RS256"],
      audience: args.clientId,
      issuer: `https://${args.domain}/`,
    }) as Auth0IdTokenPayload;

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
        err: "Email not verified in Auth0 token",
      };
    }

    if (
      args.expectedEmail &&
      normalizeEmail(payload.email) !== normalizeEmail(args.expectedEmail)
    ) {
      return {
        success: false,
        err: "Email mismatch between request and token",
      };
    }

    if (args.expectedNonce && payload.nonce !== args.expectedNonce) {
      return {
        success: false,
        err: "Nonce mismatch",
      };
    }

    return {
      success: true,
      data: {
        email: payload.email,
        name: typeof payload.name === "string" ? payload.name : undefined,
        sub: payload.sub,
        nonce: payload.nonce,
      },
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        err: `Invalid Auth0 token: ${error.message}`,
      };
    }

    return {
      success: false,
      err: `Failed to validate Auth0 token: ${error instanceof Error ? error.message : String(error)}`,
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

  if (!body.keys || !Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("Auth0 JWKS response missing keys");
  }

  jwksCache.set(cacheKey, {
    fetchedAt: now,
    keys: body.keys,
  });

  return body.keys;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
