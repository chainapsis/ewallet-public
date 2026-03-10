import type { Result } from "@oko-wallet/stdlib-js";
import type {
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { OpenModalError } from "@oko-wallet/oko-sdk-core";
import {
  openAuthSession,
  dismissAuthSession,
  getServerRedirectScheme,
} from "../native/OkoAuthBrowser";

/**
 * Open a signing modal via OS browser.
 *
 * 1. Store signing request in relay → relay_code
 * 2. Open OS browser at /mobile/sign (key shares restored from localStorage)
 * 3. Poll relay for result (key = result:{relay_code})
 * 4. When result found, dismiss Custom Tab and return
 *
 * No deep link or redirect needed — the SDK polls the relay directly
 * and closes the Custom Tab programmatically via dismissAuthSession.
 */
export async function openModalRN(
  sdkEndpoint: string,
  msg: OkoWalletMsgOpenModal,
  redirectScheme: string,
  apiKey: string,
): Promise<Result<OpenModalAckPayload, OpenModalError>> {
  try {
    // 1. Store signing request in relay
    const storeRes = await fetch(
      `${sdkEndpoint}/api/mobile/sign-relay/store`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: msg.payload }),
      },
    );

    if (!storeRes.ok) {
      return {
        success: false,
        err: { type: "unknown_error", error: `relay_store_failed: HTTP ${storeRes.status}` },
      };
    }

    const storeData = (await storeRes.json()) as {
      success: boolean;
      code?: string;
    };

    if (!storeData.success || !storeData.code) {
      return {
        success: false,
        err: { type: "unknown_error", error: "relay_store_failed: no code returned" },
      };
    }

    const relayCode = storeData.code;
    const resultKey = `result:${relayCode}`;

    // 2. Open OS browser at /mobile/sign
    const serverScheme = getServerRedirectScheme(redirectScheme);
    const signUrl = buildSignUrl(sdkEndpoint, relayCode, apiKey, serverScheme);

    // 3. Start Custom Tab and poll relay concurrently.
    //    When polling detects the result, dismissAuthSession closes the Custom Tab.
    let stopped = false;
    let pollResult: OpenModalAckPayload | null = null;

    const authPromise = openAuthSession(signUrl, redirectScheme);

    const pollPromise = (async (): Promise<void> => {
      while (!stopped) {
        try {
          const res = await fetch(
            `${sdkEndpoint}/api/mobile/sign-relay/result-consume`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: resultKey }),
            },
          );
          const data = (await res.json()) as {
            success: boolean;
            payload?: OpenModalAckPayload;
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
        dismissAuthSession();
      } catch {
        // Already closed
      }
      return { success: true, data: pollResult };
    }

    // Custom Tab was dismissed by user. One last check in case result
    // was stored right as the Custom Tab closed.
    try {
      const res = await fetch(
        `${sdkEndpoint}/api/mobile/sign-relay/result-consume`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: resultKey }),
        },
      );
      const data = (await res.json()) as {
        success: boolean;
        payload?: OpenModalAckPayload;
      };
      if (data.success && data.payload) {
        return { success: true, data: data.payload };
      }
    } catch {
      // Ignore
    }

    return {
      success: false,
      err: { type: "unknown_error", error: "user_cancelled" },
    };
  } catch (error) {
    return {
      success: false,
      err: { type: "unknown_error", error },
    };
  }
}

function buildSignUrl(
  sdkEndpoint: string,
  relayCode: string,
  apiKey: string,
  redirectScheme: string,
): string {
  const url = new URL("/mobile/sign", sdkEndpoint);
  url.searchParams.set("relay_code", relayCode);
  url.searchParams.set("host_origin", sdkEndpoint);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("redirect_scheme", redirectScheme);
  return url.toString();
}
