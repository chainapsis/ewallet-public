import type { OAuthState } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import { useCallback } from "react";

import {
  createPkcePair,
  DISCORD_CLIENT_ID,
  GITHUB_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  generateNonce,
  TELEGRAM_CLIENT_ID,
  X_CLIENT_ID,
} from "@oko-wallet-attached/config/oauth";
import { TELEGRAM_OIDC_AUTH_URL } from "@oko-wallet-attached/config/telegram";

export function findEmbeddedIframe(): Window | null {
  if (!window.opener) {
    return null;
  }

  const targetOrigin = new URL(window.location.toString()).origin;

  for (let idx = 0; idx < window.opener.frames.length; idx += 1) {
    try {
      const frame = window.opener.frames[idx];
      if (frame.location.origin === targetOrigin) {
        return frame;
      }
    } catch {
      // Cross-origin frame, skip
    }
  }

  return null;
}

export function getHostOrigin(): string {
  const params = new URLSearchParams(window.location.search);
  const hostOrigin = params.get("host_origin");
  if (hostOrigin) {
    return hostOrigin;
  }
  return window.location.origin;
}

export function sendReauthParamsToIframe(
  iframe: Window,
  params: { nonce?: string; code_verifier?: string },
): void {
  const targetOrigin = new URL(window.location.toString()).origin;

  iframe.postMessage(
    // TODO: @chihun
    // Should be type defined
    {
      target: "oko_attached",
      msg_type: "set_reauth_params",
      payload: params,
    },
    targetOrigin,
  );
}

function getThemeParam(): "light" | "dark" | null {
  const raw = new URLSearchParams(window.location.search).get("theme");
  return raw === "light" || raw === "dark" ? raw : null;
}

function buildGoogleOAuthUrl(nonce: string): string {
  const redirectUri = `${window.location.origin}/google/callback`;
  const theme = getThemeParam();

  const oauthState: OAuthState = {
    apiKey: "export_key_reauth",
    targetOrigin: getHostOrigin(),
    provider: "google",
    ...(theme && { theme }),
  };

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "token id_token");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("prompt", "login");
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("state", JSON.stringify(oauthState));

  return authUrl.toString();
}

function buildXOAuthUrl(codeChallenge: string): string {
  const redirectUri = `${window.location.origin}/x/callback`;

  const theme = getThemeParam();

  const oauthState: OAuthState = {
    apiKey: "export_key_reauth",
    targetOrigin: getHostOrigin(),
    provider: "x",
    ...(theme && { theme }),
  };
  const oauthStateString = btoa(JSON.stringify(oauthState));

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", X_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "tweet.read users.read offline.access");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", oauthStateString);

  return authUrl.toString();
}

function buildDiscordOAuthUrl(codeChallenge: string): string {
  const redirectUri = `${window.location.origin}/discord/callback`;

  const theme = getThemeParam();

  const oauthState: OAuthState = {
    apiKey: "export_key_reauth",
    targetOrigin: getHostOrigin(),
    provider: "discord",
    ...(theme && { theme }),
  };
  const oauthStateString = btoa(JSON.stringify(oauthState));

  const authUrl = new URL("https://discord.com/api/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", DISCORD_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "identify email");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", oauthStateString);

  return authUrl.toString();
}

function buildTelegramOAuthUrl(codeChallenge: string): string {
  const redirectUri = `${window.location.origin}/telegram/callback`;

  const theme = getThemeParam();

  const oauthState: OAuthState = {
    apiKey: "export_key_reauth",
    targetOrigin: getHostOrigin(),
    provider: "telegram",
    ...(theme && { theme }),
  };
  const oauthStateString = btoa(JSON.stringify(oauthState));

  const authUrl = new URL(TELEGRAM_OIDC_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", TELEGRAM_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", oauthStateString);

  return authUrl.toString();
}

function buildGithubOAuthUrl(codeChallenge: string): string {
  const redirectUri = `${window.location.origin}/github/callback`;

  const theme = getThemeParam();

  const oauthState: OAuthState = {
    apiKey: "export_key_reauth",
    targetOrigin: getHostOrigin(),
    provider: "github",
    ...(theme && { theme }),
  };
  const oauthStateString = btoa(JSON.stringify(oauthState));

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "user:email");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", oauthStateString);
  authUrl.searchParams.set("allow_signup", "false");

  return authUrl.toString();
}

export function useExportReauth() {
  const startReauth = useCallback(
    async (
      authType: "google" | "x" | "discord" | "github" | "telegram",
    ): Promise<Result<void, string>> => {
      const iframe = findEmbeddedIframe();
      if (!iframe) {
        return {
          success: false,
          err: "Cannot find embedded iframe. Make sure this page was opened from the dashboard.",
        };
      }

      let oauthUrl: string;

      if (authType === "google") {
        const nonce = generateNonce();
        sendReauthParamsToIframe(iframe, { nonce });
        oauthUrl = buildGoogleOAuthUrl(nonce);
      } else {
        // X and Discord use PKCE
        const { codeVerifier, codeChallenge } = await createPkcePair();
        sendReauthParamsToIframe(iframe, { code_verifier: codeVerifier });

        if (authType === "x") {
          oauthUrl = buildXOAuthUrl(codeChallenge);
        } else if (authType === "discord") {
          oauthUrl = buildDiscordOAuthUrl(codeChallenge);
        } else if (authType === "telegram") {
          oauthUrl = buildTelegramOAuthUrl(codeChallenge);
        } else {
          oauthUrl = buildGithubOAuthUrl(codeChallenge);
        }
      }

      window.location.href = oauthUrl;

      return { success: true, data: void 0 };
    },
    [],
  );

  return { startReauth };
}
