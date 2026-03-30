import type {
  OAuthState,
  OkoWalletMsgGenerateOAuthUrl,
  OkoWalletMsgGenerateOAuthUrlAck,
} from "@oko-wallet/oko-sdk-core";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
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
import { useAppState } from "@oko-wallet-attached/store/app";

function buildGoogleOAuthUrl(
  nonce: string,
  state: OAuthState,
  redirectBaseOrigin: string,
): string {
  const redirectUri = `${redirectBaseOrigin}/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "token id_token");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("prompt", "login");
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("state", JSON.stringify(state));

  return authUrl.toString();
}

function buildXOAuthUrl(
  codeChallenge: string,
  state: OAuthState,
  redirectBaseOrigin: string,
): string {
  const redirectUri = `${redirectBaseOrigin}/x/callback`;

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", X_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "tweet.read users.read offline.access");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", btoa(JSON.stringify(state)));

  return authUrl.toString();
}

function buildDiscordOAuthUrl(
  codeChallenge: string,
  state: OAuthState,
  redirectBaseOrigin: string,
): string {
  const redirectUri = `${redirectBaseOrigin}/discord/callback`;

  const authUrl = new URL("https://discord.com/api/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", DISCORD_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "identify email");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", btoa(JSON.stringify(state)));

  return authUrl.toString();
}

function buildGithubOAuthUrl(
  codeChallenge: string,
  state: OAuthState,
  redirectBaseOrigin: string,
): string {
  const redirectUri = `${redirectBaseOrigin}/github/callback`;

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "user:email");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", btoa(JSON.stringify(state)));

  return authUrl.toString();
}

function buildTelegramOAuthUrl(
  codeChallenge: string,
  state: OAuthState,
  redirectBaseOrigin: string,
): string {
  const redirectUri = `${redirectBaseOrigin}/telegram/callback`;

  const authUrl = new URL(TELEGRAM_OIDC_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", TELEGRAM_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", btoa(JSON.stringify(state)));

  return authUrl.toString();
}

async function buildOAuthUrl(
  provider: string,
  apiKey: string,
  targetOrigin: string,
  storageKey: string,
  redirectScheme?: string | null,
  mobileOsBrowser?: boolean,
): Promise<string> {
  const appState = useAppState.getState();

  const rawTheme =
    appState.getTheme(storageKey) ??
    new URLSearchParams(window.location.search).get("theme");
  const sdkTheme =
    rawTheme === "light" || rawTheme === "dark" ? rawTheme : null;

  const state: OAuthState = {
    apiKey,
    targetOrigin,
    provider: provider as AuthType,
    ...(redirectScheme ? { redirectScheme } : {}),
    ...(mobileOsBrowser && { mobileOsBrowser }),
    ...(sdkTheme && { theme: sdkTheme }),
  };

  // Mobile OS browser: redirect back to mobile host web (targetOrigin), not attached
  const redirectBaseOrigin = mobileOsBrowser
    ? targetOrigin
    : window.location.origin;

  if (provider === "google") {
    const nonce = generateNonce();
    appState.setNonce(storageKey, nonce);
    return buildGoogleOAuthUrl(nonce, state, redirectBaseOrigin);
  }

  // X, Discord, GitHub use PKCE
  const { codeVerifier, codeChallenge } = await createPkcePair();
  appState.setCodeVerifier(storageKey, codeVerifier);
  appState.setOauthRedirectOrigin(storageKey, redirectBaseOrigin);

  switch (provider) {
    case "x":
      return buildXOAuthUrl(codeChallenge, state, redirectBaseOrigin);
    case "discord":
      return buildDiscordOAuthUrl(codeChallenge, state, redirectBaseOrigin);
    case "github":
      return buildGithubOAuthUrl(codeChallenge, state, redirectBaseOrigin);
    case "telegram":
      return buildTelegramOAuthUrl(codeChallenge, state, redirectBaseOrigin);
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

export async function handleGenerateOAuthUrl(
  ctx: MsgEventContext,
  message: OkoWalletMsgGenerateOAuthUrl,
): Promise<void> {
  const { port, storageKey } = ctx;

  try {
    const payload = message.payload as typeof message.payload & {
      redirectScheme?: string | null;
    };
    const { provider, apiKey, targetOrigin, redirectScheme, mobileOsBrowser } =
      payload;

    const url = await buildOAuthUrl(
      provider,
      apiKey,
      targetOrigin,
      storageKey,
      redirectScheme,
      mobileOsBrowser,
    );

    const ack: OkoWalletMsgGenerateOAuthUrlAck = {
      target: OKO_SDK_TARGET,
      msg_type: "generate_oauth_url_ack",
      payload: {
        success: true,
        data: { url },
      },
    };

    port.postMessage(ack);
  } catch (error) {
    const ack: OkoWalletMsgGenerateOAuthUrlAck = {
      target: OKO_SDK_TARGET,
      msg_type: "generate_oauth_url_ack",
      payload: {
        success: false,
        err: `Failed to generate OAuth URL: ${error instanceof Error ? error.message : String(error)}`,
      },
    };

    port.postMessage(ack);
  }
}
