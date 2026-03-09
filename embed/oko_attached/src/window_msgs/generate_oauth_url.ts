import type {
  OAuthProvider,
  OAuthState,
  OkoWalletMsgGenerateOAuthUrl,
  OkoWalletMsgGenerateOAuthUrlAck,
} from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import {
  createPkcePair,
  DISCORD_CLIENT_ID,
  GITHUB_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  generateNonce,
  X_CLIENT_ID,
} from "@oko-wallet-attached/config/oauth";
import { useAppState } from "@oko-wallet-attached/store/app";

function buildGoogleOAuthUrl(
  apiKey: string,
  targetOrigin: string,
  nonce: string,
  redirectScheme?: string,
  mobileOsBrowser?: boolean,
): string {
  const redirectUri = `${window.location.origin}/google/callback`;

  const oauthState: OAuthState = {
    apiKey,
    targetOrigin,
    provider: "google",
    ...(redirectScheme && { redirectScheme }),
    ...(mobileOsBrowser && { mobileOsBrowser }),
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

function buildXOAuthUrl(
  apiKey: string,
  targetOrigin: string,
  codeChallenge: string,
  redirectScheme?: string,
  mobileOsBrowser?: boolean,
): string {
  const redirectUri = `${window.location.origin}/x/callback`;

  const oauthState: OAuthState = {
    apiKey,
    targetOrigin,
    provider: "x",
    ...(redirectScheme && { redirectScheme }),
    ...(mobileOsBrowser && { mobileOsBrowser }),
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

function buildDiscordOAuthUrl(
  apiKey: string,
  targetOrigin: string,
  codeChallenge: string,
  redirectScheme?: string,
  mobileOsBrowser?: boolean,
): string {
  const redirectUri = `${window.location.origin}/discord/callback`;

  const oauthState: OAuthState = {
    apiKey,
    targetOrigin,
    provider: "discord",
    ...(redirectScheme && { redirectScheme }),
    ...(mobileOsBrowser && { mobileOsBrowser }),
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

function buildGithubOAuthUrl(
  apiKey: string,
  targetOrigin: string,
  codeChallenge: string,
  redirectScheme?: string,
  mobileOsBrowser?: boolean,
): string {
  const redirectUri = `${window.location.origin}/github/callback`;

  const oauthState: OAuthState = {
    apiKey,
    targetOrigin,
    provider: "github",
    ...(redirectScheme && { redirectScheme }),
    ...(mobileOsBrowser && { mobileOsBrowser }),
  };
  const oauthStateString = btoa(JSON.stringify(oauthState));

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "user:email");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", oauthStateString);

  return authUrl.toString();
}

async function buildOAuthUrl(
  provider: OAuthProvider,
  apiKey: string,
  targetOrigin: string,
  hostOrigin: string,
  redirectScheme?: string,
  mobileOsBrowser?: boolean,
): Promise<string> {
  const appState = useAppState.getState();

  if (provider === "google") {
    const nonce = generateNonce();
    appState.setNonce(hostOrigin, nonce);
    return buildGoogleOAuthUrl(apiKey, targetOrigin, nonce, redirectScheme, mobileOsBrowser);
  }

  // X, Discord, GitHub use PKCE
  const { codeVerifier, codeChallenge } = await createPkcePair();
  appState.setCodeVerifier(hostOrigin, codeVerifier);

  switch (provider) {
    case "x":
      return buildXOAuthUrl(apiKey, targetOrigin, codeChallenge, redirectScheme, mobileOsBrowser);
    case "discord":
      return buildDiscordOAuthUrl(apiKey, targetOrigin, codeChallenge, redirectScheme, mobileOsBrowser);
    case "github":
      return buildGithubOAuthUrl(apiKey, targetOrigin, codeChallenge, redirectScheme, mobileOsBrowser);
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

export async function handleGenerateOAuthUrl(
  ctx: MsgEventContext,
  message: OkoWalletMsgGenerateOAuthUrl,
): Promise<void> {
  const { port, hostOrigin } = ctx;

  try {
    const { provider, apiKey, targetOrigin, redirectScheme } = message.payload;
    const mobileOsBrowser = (message.payload as { mobileOsBrowser?: boolean }).mobileOsBrowser;

    const url = await buildOAuthUrl(provider, apiKey, targetOrigin, hostOrigin, redirectScheme, mobileOsBrowser);

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
