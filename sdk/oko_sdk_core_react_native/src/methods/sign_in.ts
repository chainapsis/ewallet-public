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
 * 1. Generate session_id, open OS browser at /mobile/login (OAuth + keygen)
 * 2. Key shares persist in attached's localStorage (zustand persist)
 * 3. Login complete page stores wallet info in relay with key = session_id
 * 4. SDK polls relay for result, then dismisses the Custom Tab
 *
 * No deep link or redirect needed — key shares never enter the RN app
 * JS runtime or WebView.
 */
export async function signInRN(
  sdkEndpoint: string,
  type: SignInType,
  apiKey: string,
  options?: SignInOptions,
): Promise<SignInResult> {
  const redirectScheme =
    options?.redirectScheme ?? DEFAULT_REDIRECT_SCHEME;

  const sessionId = generateSessionId();
  const loginUrl = buildLoginUrl(sdkEndpoint, type, apiKey, sessionId, redirectScheme);

  // Start Custom Tab and poll relay concurrently.
  // When polling detects the wallet info, dismissAuthSession closes the Custom Tab.
  let stopped = false;
  let pollResult: unknown = null;

  const authPromise = WebBrowser.openAuthSessionAsync(
    loginUrl,
    `${redirectScheme}://`,
  );

  const pollPromise = (async (): Promise<void> => {
    while (!stopped) {
      try {
        const res = await fetch(
          `${sdkEndpoint}/api/mobile/sign-relay/consume`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: sessionId }),
          },
        );
        const data = (await res.json()) as {
          success: boolean;
          payload?: unknown;
        };
        if (data.success && data.payload) {
          pollResult = data.payload;
          return;
        }
      } catch {
        // Ignore network errors, keep polling
      }
      if (!stopped) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  })();

  // Race: either Custom Tab closes (user dismiss) or poll finds result
  await Promise.race([authPromise, pollPromise]);
  stopped = true;

  if (pollResult) {
    try {
      WebBrowser.dismissAuthSession();
    } catch {
      // Already closed
    }
    return { walletInfo: pollResult };
  }

  // Custom Tab was dismissed by user. One last check.
  try {
    const res = await fetch(
      `${sdkEndpoint}/api/mobile/sign-relay/consume`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionId }),
      },
    );
    const data = (await res.json()) as {
      success: boolean;
      payload?: unknown;
    };
    if (data.success && data.payload) {
      return { walletInfo: data.payload };
    }
  } catch {
    // Ignore
  }

  throw new Error("Sign-in cancelled or failed");
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
