import * as WebBrowser from "expo-web-browser";
import type { SignInType } from "@oko-wallet/oko-sdk-core";

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
 * 1. Open OS browser at /mobile/login (OAuth + keygen)
 * 2. Key shares persist in attached's localStorage (zustand persist)
 * 3. Deep link back with wallet_info_code
 * 4. Consume relay code → public wallet info
 *
 * Key shares never enter the RN app JS runtime or WebView.
 */
export async function signInRN(
  sdkEndpoint: string,
  type: SignInType,
  apiKey: string,
  options?: SignInOptions,
): Promise<SignInResult> {
  const redirectScheme =
    options?.redirectScheme ?? DEFAULT_REDIRECT_SCHEME;

  // Open OS browser at /mobile/login
  // Session cookie is created by the /mobile/login route handler in the OS browser context.
  const loginUrl = buildLoginUrl(sdkEndpoint, type, apiKey, redirectScheme);

  const result = await WebBrowser.openAuthSessionAsync(
    loginUrl,
    `${redirectScheme}://`,
  );

  if (result.type !== "success") {
    throw new Error(`Sign-in cancelled or failed: ${result.type}`);
  }

  // Parse wallet_info_code from deep link
  const callbackUrl = new URL(result.url);
  const walletInfoCode = callbackUrl.searchParams.get("wallet_info_code");

  if (!walletInfoCode) {
    throw new Error(
      "Missing wallet_info_code in callback — login may have failed",
    );
  }

  // Consume relay code to get public wallet info
  const consumeRes = await fetch(
    `${sdkEndpoint}/api/mobile/sign-relay/consume`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: walletInfoCode }),
    },
  );

  if (!consumeRes.ok) {
    throw new Error(`Failed to consume wallet info: ${consumeRes.status}`);
  }

  const consumeData = (await consumeRes.json()) as {
    success: boolean;
    payload?: unknown;
  };

  if (!consumeData.success || !consumeData.payload) {
    throw new Error("Failed to consume wallet info: invalid or expired code");
  }

  return {
    walletInfo: consumeData.payload,
  };
}

function buildLoginUrl(
  sdkEndpoint: string,
  provider: string,
  apiKey: string,
  redirectScheme: string,
): string {
  const url = new URL("/mobile/login", sdkEndpoint);
  url.searchParams.set("provider", provider);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("redirect_scheme", redirectScheme);
  url.searchParams.set("host_origin", sdkEndpoint);
  return url.toString();
}
