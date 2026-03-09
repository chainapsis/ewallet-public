import * as WebBrowser from "expo-web-browser";
import type { SignInType } from "@oko-wallet/oko-sdk-core";

export interface SignInOptions {
  redirectScheme: string;
}

export interface SignInResult {
  walletInfo: unknown;
  deviceKey: string;
}

const DEFAULT_REDIRECT_SCHEME = "okowallet";

/**
 * Sign in via OS browser — the entire login + keygen flow runs
 * in the system browser, completely outside the host app's WebView.
 *
 * 1. Generate device_key locally (crypto.getRandomValues)
 * 2. Create server session (sets session cookie only)
 * 3. Open OS browser at /rn/login (OAuth + keygen + key share upload)
 * 4. Deep link back with wallet_info_code
 * 5. Consume relay code → public wallet info
 *
 * The server NEVER sees the device_key.
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

  // 1. Generate device_key client-side — server never sees this
  const deviceKey = generateDeviceKey();

  // 2. Open OS browser at /rn/login
  // Session cookie is created by the /rn/login route handler in the OS browser context.
  // This ensures the cookie lives in ASWebAuthenticationSession's cookie jar,
  // not in the RN app's HTTP client.
  const loginUrl = buildLoginUrl(
    sdkEndpoint,
    type,
    apiKey,
    redirectScheme,
    deviceKey,
  );

  const result = await WebBrowser.openAuthSessionAsync(
    loginUrl,
    `${redirectScheme}://`,
  );

  if (result.type !== "success") {
    throw new Error(`Sign-in cancelled or failed: ${result.type}`);
  }

  // 4. Parse wallet_info_code from deep link
  const callbackUrl = new URL(result.url);
  const walletInfoCode = callbackUrl.searchParams.get("wallet_info_code");

  if (!walletInfoCode) {
    throw new Error(
      "Missing wallet_info_code in callback — login may have failed",
    );
  }

  // 5. Consume relay code to get public wallet info
  const consumeRes = await fetch(
    `${sdkEndpoint}/api/rn/sign-relay/consume`,
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
    deviceKey,
  };
}

/**
 * Generate a 256-bit device key using crypto.getRandomValues (polyfilled by
 * react-native-get-random-values). Returns hex string.
 */
function generateDeviceKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildLoginUrl(
  sdkEndpoint: string,
  provider: string,
  apiKey: string,
  redirectScheme: string,
  deviceKey: string,
): string {
  const url = new URL("/rn/login", sdkEndpoint);
  url.searchParams.set("provider", provider);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("redirect_scheme", redirectScheme);
  url.searchParams.set("host_origin", sdkEndpoint);
  // device_key goes in fragment — never sent to server in URL
  return `${url.toString()}#dk=${deviceKey}`;
}
