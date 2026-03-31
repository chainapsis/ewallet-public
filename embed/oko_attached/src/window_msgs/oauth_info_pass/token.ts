import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";

import { verifyIdTokenOfDiscord } from "./discord";
import { verifyIdTokenOfGithub } from "./github";
import { createJwksVerifier, decodeJwtPayload } from "./jwks_verify";
import { verifyIdTokenOfX } from "./x";
import {
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN,
} from "@oko-wallet-attached/config/auth0";
import { GOOGLE_CLIENT_ID } from "@oko-wallet-attached/config/oauth";
import { TELEGRAM_CLIENT_ID } from "@oko-wallet-attached/config/telegram";
import type {
  Auth0TokenInfo,
  GoogleTokenInfo,
  TokenInfo,
} from "@oko-wallet-attached/window_msgs/types";

const googleJwks = createJwksVerifier(
  "https://www.googleapis.com/oauth2/v3/certs",
  "Google",
);
const auth0Jwks = createJwksVerifier(
  `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  "Auth0",
);
// Telegram JWKS endpoint does not support CORS, so browser-side signature
// verification is not possible. The server auth middleware verifies the JWT
// signature instead, so client-side verification is safely skipped.

export async function verifyIdToken(
  authType: AuthType,
  idToken: string,
  nonce?: string,
): Promise<Result<TokenInfo, string>> {
  try {
    if (authType === "auth0") {
      if (!nonce) {
        return {
          success: false,
          err: "Nonce is required for Auth0",
        };
      }

      const auth0TokenInfo = await verifyAuth0IdToken(idToken, nonce);
      return {
        success: true,
        data: {
          provider: "auth0",
          user_identifier: auth0TokenInfo.email,
        },
      };
    }

    if (authType === "google") {
      if (!nonce) {
        return {
          success: false,
          err: "Nonce is required for Google",
        };
      }

      const googleTokenInfo = await verifyGoogleIdToken(idToken, nonce);
      return {
        success: true,
        data: {
          provider: "google",
          // in google, use google sub as user identifier with prefix
          user_identifier: `google_${googleTokenInfo.sub}`,
        },
      };
    }

    if (authType === "discord") {
      const discordTokenInfo = await verifyIdTokenOfDiscord(idToken);

      if (!discordTokenInfo.success) {
        return {
          success: false,
          err: discordTokenInfo.err,
        };
      }

      if (!discordTokenInfo.data.email) {
        return {
          success: false,
          err: "Discord email not found",
        };
      }

      return {
        success: true,
        data: {
          provider: "discord",
          // in discord, use discord id as user identifier with prefix
          user_identifier: `discord_${discordTokenInfo.data.id}`,
        },
      };
    }

    if (authType === "x") {
      const xTokenInfo = await verifyIdTokenOfX(idToken);

      if (!xTokenInfo.success) {
        return {
          success: false,
          err: xTokenInfo.err,
        };
      }

      return {
        success: true,
        data: {
          provider: "x",
          // in x, use x id as user identifier with prefix
          user_identifier: `x_${xTokenInfo.data.id}`,
        },
      };
    }

    if (authType === "github") {
      const githubTokenInfo = await verifyIdTokenOfGithub(idToken);

      if (!githubTokenInfo.success) {
        return {
          success: false,
          err: githubTokenInfo.err,
        };
      }

      return {
        success: true,
        data: {
          provider: "github",
          user_identifier: `github_${githubTokenInfo.data.id}`,
        },
      };
    }

    if (authType === "telegram") {
      const telegramTokenInfo = await verifyTelegramIdToken(idToken);

      return {
        success: true,
        data: {
          provider: "telegram",
          user_identifier: `telegram_${telegramTokenInfo.sub}`,
        },
      };
    }

    return {
      success: false,
      err: `Invalid authentication type: ${authType}`,
    };
  } catch (error) {
    return {
      success: false,
      err: `Failed to verify id token: ${error}`,
    };
  }
}

async function verifyGoogleIdToken(
  idToken: string,
  nonce: string,
): Promise<GoogleTokenInfo> {
  await googleJwks.verifySignature(idToken);

  const payload = decodeJwtPayload<GoogleTokenInfo>(idToken, "Google");

  if (
    payload.iss !== "https://accounts.google.com" &&
    payload.iss !== "accounts.google.com"
  ) {
    throw new Error("Invalid Google token issuer");
  }

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Invalid Google token audience");
  }

  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp <= 0) {
    throw new Error("Google token missing or invalid exp claim");
  }
  if (Math.floor(Date.now() / 1000) >= exp) {
    throw new Error("Google token has expired");
  }

  if (
    payload.nbf != null &&
    Math.floor(Date.now() / 1000) < Number(payload.nbf)
  ) {
    throw new Error("Google token is not yet valid");
  }

  if (!payload.email_verified) {
    throw new Error("Google token email not verified");
  }

  if (payload.nonce !== nonce) {
    throw new Error("Google token nonce mismatch");
  }

  if (!payload.sub) {
    throw new Error("Google token sub not found");
  }

  return payload;
}

async function verifyAuth0IdToken(
  idToken: string,
  nonce: string,
): Promise<Auth0TokenInfo> {
  await auth0Jwks.verifySignature(idToken);

  const payload = decodeJwtPayload<Auth0TokenInfo>(idToken, "Auth0");

  if (payload.iss !== `https://${AUTH0_DOMAIN}/`) {
    throw new Error("Invalid Auth0 token issuer");
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.filter(Boolean).includes(AUTH0_CLIENT_ID)) {
    throw new Error("Invalid Auth0 token audience");
  }

  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp <= 0) {
    throw new Error("Auth0 token missing or invalid exp claim");
  }
  if (Math.floor(Date.now() / 1000) >= exp) {
    throw new Error("Auth0 token has expired");
  }

  if (!payload.email) {
    throw new Error("Auth0 token missing email claim");
  }

  if (!payload.email_verified) {
    throw new Error("Auth0 token email not verified");
  }

  if (payload.nonce !== nonce) {
    throw new Error("Auth0 token nonce mismatch");
  }

  return payload;
}

interface TelegramTokenInfo {
  sub: string;
  id?: number;
  preferred_username?: string;
  name?: string;
  picture?: string;
  iss?: string;
  aud?: string;
  exp?: number;
}

async function verifyTelegramIdToken(
  idToken: string,
): Promise<TelegramTokenInfo> {
  const payload = decodeJwtPayload<TelegramTokenInfo>(idToken, "Telegram");

  if (payload.iss !== "https://oauth.telegram.org") {
    throw new Error("Invalid Telegram token issuer");
  }

  if (payload.aud !== TELEGRAM_CLIENT_ID) {
    throw new Error("Invalid Telegram token audience");
  }

  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp <= 0) {
    throw new Error("Telegram token missing or invalid exp claim");
  }
  if (Math.floor(Date.now() / 1000) >= exp) {
    throw new Error("Telegram token has expired");
  }

  // Telegram OIDC sub is a pairwise identifier (differs per bot).
  // Use the id claim (real Telegram user ID) for legacy compatibility.
  const sub =
    (payload.id != null ? String(payload.id) : undefined) ?? payload.sub;
  if (!sub) {
    throw new Error("Telegram token sub not found");
  }

  return { ...payload, sub };
}
