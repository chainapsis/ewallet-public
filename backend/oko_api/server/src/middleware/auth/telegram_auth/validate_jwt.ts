import type { Result } from "@oko-wallet/stdlib-js";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";
import { Agent } from "undici";

import { TELEGRAM_CLIENT_ID } from "./client_id";
import type { TelegramUserInfo } from "./validate";
import {
  createJwksCache,
  jwkToPem,
} from "@oko-wallet-api/middleware/auth/jwks_cache";

const TELEGRAM_OIDC_ISSUER = "https://oauth.telegram.org";
const TELEGRAM_JWKS_URL = "https://oauth.telegram.org/.well-known/jwks.json";

// oauth.telegram.org has AAAA records but IPv6 connectivity is unreliable.
// Force IPv4 to prevent intermittent ETIMEDOUT from Happy Eyeballs.
const telegramAgent = new Agent({
  connect: { family: 4 } as Record<string, unknown>,
});
const telegramJwksCache = createJwksCache(TELEGRAM_JWKS_URL, "Telegram", {
  // @ts-expect-error -- Node.js undici dispatcher, not in standard RequestInit
  dispatcher: telegramAgent,
});

interface TelegramIdTokenPayload extends JwtPayload {
  id?: number;
  preferred_username?: string;
  name?: string;
  picture?: string;
}

export async function validateTelegramJwt(
  idToken: string,
): Promise<Result<TelegramUserInfo, string>> {
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

    const jwk = await telegramJwksCache.getSigningKey(header.kid);

    if (!jwk) {
      return {
        success: false,
        err: "Unable to find signing key for token",
      };
    }

    const pem = jwkToPem(jwk);

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
        err: "Missing Telegram user ID (id) in token",
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
    const message =
      error instanceof Error ? error.message : "JWT validation failed";
    return {
      success: false,
      err: message,
    };
  }
}
