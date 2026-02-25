import { useCallback } from "react";

import type { OAuthState } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

// Client IDs (public constants, same as SDK)
const GOOGLE_CLIENT_ID =
  "421793224165-cpmbt6enqrj6ad6n4ujokham8qdmnnln.apps.googleusercontent.com";
const X_CLIENT_ID = "eWJPdVNYNlV6dEpNSTM3T01GRGI6MTpjaQ";
const DISCORD_CLIENT_ID = "1445280712121913384";

export function generateNonce(length = 8) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRandomString(length = 64): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let binary = "";
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }

  const base64 = btoa(binary);
  return base64.replace(/[+\/]|(=+)$/g, (match) => {
    if (match === "+") {
      return "-";
    }
    if (match === "/") {
      return "_";
    }
    return "";
  });
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/[+\/]|(=+)$/g, (match) => {
    if (match === "+") {
      return "-";
    }
    if (match === "/") {
      return "_";
    }
    return "";
  });
}

async function createPkcePair(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(64);
  const hash = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}

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

export function sendReauthParamsToIframe(
  iframe: Window,
  params: { nonce?: string; code_verifier?: string },
): void {
  const targetOrigin = new URL(window.location.toString()).origin;

  iframe.postMessage(
    {
      target: "oko_attached",
      msg_type: "set_reauth_params",
      payload: params,
    },
    targetOrigin,
  );
}

function buildGoogleOAuthUrl(nonce: string): string {
  const redirectUri = `${window.location.origin}/google/callback`;

  const oauthState: OAuthState = {
    apiKey: "reauth",
    targetOrigin: window.location.origin,
    provider: "google",
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

  const oauthState: OAuthState = {
    apiKey: "reauth",
    targetOrigin: window.location.origin,
    provider: "x",
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

  const oauthState: OAuthState = {
    apiKey: "reauth",
    targetOrigin: window.location.origin,
    provider: "discord",
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

export function useExportReauth() {
  const startReauth = useCallback(
    async (
      authType: "google" | "x" | "discord",
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
        } else {
          oauthUrl = buildDiscordOAuthUrl(codeChallenge);
        }
      }

      window.location.href = oauthUrl;

      return { success: true, data: void 0 };
    },
    [],
  );

  return { startReauth };
}
