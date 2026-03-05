import type { Result } from "@oko-wallet/stdlib-js";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import type {
  GoogleTokenInfo,
  Auth0TokenInfo,
  TokenInfo,
} from "@oko-wallet-attached/window_msgs/types";
import {
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN,
} from "@oko-wallet-attached/config/auth0";
import { verifyIdTokenOfDiscord } from "./discord";
import { verifyIdTokenOfGithub } from "./github";
import { verifyIdTokenOfX } from "./x";

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
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
  );

  if (!response.ok) {
    throw new Error(`Google authentication is invalid. Please sign in again.`);
  }

  const googleTokenInfo = (await response.json()) as GoogleTokenInfo;

  if (googleTokenInfo.nonce !== nonce) {
    throw new Error("Google token nonce mismatch");
  }

  if (!googleTokenInfo.sub) {
    throw new Error("Google token sub not found");
  }

  return googleTokenInfo;
}

async function verifyAuth0IdToken(
  idToken: string,
  nonce: string,
): Promise<Auth0TokenInfo> {
  const payload = decodeAuth0IdToken(idToken);

  if (payload.iss !== `https://${AUTH0_DOMAIN}/`) {
    throw new Error("Invalid Auth0 token issuer");
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.filter(Boolean).includes(AUTH0_CLIENT_ID)) {
    throw new Error("Invalid Auth0 token audience");
  }

  const exp = Number(payload.exp);
  if (exp && Math.floor(Date.now() / 1000) >= exp) {
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

function decodeAuth0IdToken(idToken: string): Auth0TokenInfo {
  const segments = idToken.split(".");
  if (segments.length < 2) {
    throw new Error("Invalid Auth0 id_token");
  }

  const textDecoder = new TextDecoder();

  try {
    let base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) {
      base64 += "=".repeat(4 - pad);
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const payloadJson = textDecoder.decode(bytes);
    return JSON.parse(payloadJson) as Auth0TokenInfo;
  } catch (error) {
    throw new Error(`Failed to decode Auth0 id_token: ${error}`);
  }
}
