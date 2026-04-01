import type { Result } from "@oko-wallet/stdlib-js";
import { createPublicKey, type JsonWebKey } from "crypto";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";
import { Agent } from "undici";

import type { OAuthValidationFail } from "../types";
import { TELEGRAM_CLIENT_ID } from "./client_id";
import type { TelegramUserInfo } from "./types";

const TELEGRAM_OIDC_ISSUER = "https://oauth.telegram.org";
const TELEGRAM_JWKS_URL = "https://oauth.telegram.org/.well-known/jwks.json";

// oauth.telegram.org has AAAA records but IPv6 connectivity is unreliable.
// Force IPv4 to prevent intermittent ETIMEDOUT from Happy Eyeballs.
const telegramAgent = new Agent({
  connect: { family: 4 } as Record<string, unknown>,
});

interface TelegramJwk extends JsonWebKey {
  kid: string;
}

interface TelegramIdTokenPayload extends JwtPayload {
  id?: number;
  preferred_username?: string;
  name?: string;
  picture?: string;
}

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const jwksCache = new Map<
  string,
  {
    fetchedAt: number;
    keys: TelegramJwk[];
  }
>();

export async function validateTelegramJwt(
  idToken: string,
): Promise<Result<TelegramUserInfo, OAuthValidationFail>> {
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

    const header = decoded.header;

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
      issuer: TELEGRAM_OIDC_ISSUER,
      audience: TELEGRAM_CLIENT_ID,
    }) as TelegramIdTokenPayload;

    // Telegram OIDC sub is a pairwise identifier (differs per bot).
    // Use the id claim (real Telegram user ID) for legacy compatibility.
    if (payload.id == null) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Missing Telegram user ID (id) in token",
        },
      };
    }

    const userId = String(payload.id);

    return {
      success: true,
      data: {
        id: userId,
        username: payload.preferred_username,
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

    const message =
      error instanceof Error ? error.message : "JWT validation failed";
    return {
      success: false,
      err: {
        type: "invalid_token",
        message,
      },
    };
  }
}

async function getSigningKey(kid: string): Promise<TelegramJwk | null> {
  const cached = jwksCache.get(TELEGRAM_JWKS_URL);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < JWKS_CACHE_TTL_MS) {
    const match = cached.keys.find((k) => k.kid === kid);
    if (match) {
      return match;
    }
  }

  const response = await fetch(TELEGRAM_JWKS_URL, {
    // @ts-expect-error -- Node.js undici dispatcher, not in standard RequestInit
    dispatcher: telegramAgent,
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Telegram JWKS: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as { keys?: TelegramJwk[] };
  if (!body.keys || !Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("Telegram JWKS response missing keys");
  }

  jwksCache.set(TELEGRAM_JWKS_URL, { fetchedAt: now, keys: body.keys });

  return body.keys.find((k) => k.kid === kid) ?? null;
}
