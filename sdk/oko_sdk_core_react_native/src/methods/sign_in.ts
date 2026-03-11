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

/**
 * Sign in via OS browser — the entire login + keygen flow runs
 * in the system browser, completely outside the host app's WebView.
 *
 * 1. Generate session_id, open OS browser at /mobile/login (OAuth + keygen)
 * 2. Key shares persist in attached's localStorage (zustand persist)
 * 3. Login complete page stores wallet info in relay, then redirects to callback
 * 4. CallbackActivity receives redirect → Custom Tab auto-closes
 * 5. SDK fetches wallet info from relay
 */
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

  // Open OS browser — blocks until callback redirect or user cancel.
  // On Android: ManagementActivity keeps Custom Tab in same task.
  //   CallbackActivity receives oko.auth.callback:// → CLEAR_TOP pops Custom Tab.
  // On iOS: ASWebAuthenticationSession auto-closes on scheme match.
  const result = await openAuthSession(loginUrl, redirectScheme);

  if (result.type === "cancel") {
    throw new Error("Sign-in cancelled");
  }

  // Custom Tab closed via callback — fetch wallet info from relay.
  // The server page stores the result before redirecting, but a brief
  // race is possible, so we retry a few times.
  const walletInfo = await fetchRelayResult(sdkEndpoint, sessionId);
  return { walletInfo };
}

/**
 * Fetch result from relay with retries.
 */
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
