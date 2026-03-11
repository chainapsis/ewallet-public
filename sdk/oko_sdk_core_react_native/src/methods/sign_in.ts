import type { SignInType } from "@oko-wallet/oko-sdk-core";
import {
  openAuthSession,
  getServerRedirectScheme,
} from "../native/OkoAuthBrowser";

export interface SignInOptions {
  redirectScheme: string;
}

export interface SignInResult {
  walletInfo: unknown;
}

const DEFAULT_REDIRECT_SCHEME = "okowallet";

export async function signInRN(
  sdkEndpoint: string,
  type: SignInType,
  apiKey: string,
  options?: SignInOptions,
): Promise<SignInResult> {
  const redirectScheme = options?.redirectScheme ?? DEFAULT_REDIRECT_SCHEME;

  const sessionId = generateSessionId();
  const serverScheme = getServerRedirectScheme(redirectScheme);
  const loginUrl = buildLoginUrl(
    sdkEndpoint,
    type,
    apiKey,
    sessionId,
    serverScheme,
  );

  const result = await openAuthSession(loginUrl, redirectScheme);

  if (result.type === "cancel") {
    throw new Error("Sign-in cancelled");
  }

  const walletInfo = await fetchRelayResult(sdkEndpoint, sessionId);
  return { walletInfo };
}

async function fetchRelayResult(
  sdkEndpoint: string,
  code: string,
  maxRetries = 10,
  delayMs = 500,
): Promise<unknown> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${sdkEndpoint}/api/mobile/sign-relay/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        success: boolean;
        payload?: unknown;
      };
      if (data.success && data.payload) {
        return data.payload;
      }
    } catch {
      // Network error, retry
    }
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Failed to retrieve sign-in result from relay");
}

function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildLoginUrl(
  sdkEndpoint: string,
  provider: string,
  apiKey: string,
  sessionId: string,
  redirectScheme: string,
): string {
  const url = new URL("/mobile/login", sdkEndpoint);
  url.searchParams.set("provider", provider);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("session_id", sessionId);
  url.searchParams.set("redirect_scheme", redirectScheme);
  url.searchParams.set("host_origin", sdkEndpoint);
  return url.toString();
}
