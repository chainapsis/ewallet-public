import * as WebBrowser from "expo-web-browser";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { OpenModalError } from "@oko-wallet/oko-sdk-core";

/**
 * Open a signing modal via OS browser.
 *
 * 1. Store signing request in relay → relay_code
 * 2. Open OS browser at /mobile/sign (key shares restored from localStorage)
 * 3. Deep link back with result_code
 * 4. Consume result relay → signing result
 *
 * Key shares persist in attached's localStorage (zustand persist), shared
 * across OS browser sessions. No server-side key share storage needed.
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

    // 2. Open OS browser at /mobile/sign
    const signUrl = buildSignUrl(sdkEndpoint, relayCode, redirectScheme, apiKey);

    const result = await WebBrowser.openAuthSessionAsync(
      signUrl,
      `${redirectScheme}://`,
    );

    if (result.type !== "success") {
      return {
        success: false,
        err: { type: "unknown_error", error: `user_cancelled: ${result.type}` },
      };
    }

    // 3. Parse result_code from deep link
    const callbackUrl = new URL(result.url);
    const resultCode = callbackUrl.searchParams.get("result_code");

    if (!resultCode) {
      return {
        success: false,
        err: { type: "unknown_error", error: "missing_result_code in callback URL" },
      };
    }

    // 4. Consume result relay
    const consumeRes = await fetch(
      `${sdkEndpoint}/api/mobile/sign-relay/result-consume`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: resultCode }),
      },
    );

    if (!consumeRes.ok) {
      return {
        success: false,
        err: { type: "unknown_error", error: `result_consume_failed: HTTP ${consumeRes.status}` },
      };
    }

    const consumeData = (await consumeRes.json()) as {
      success: boolean;
      payload?: OpenModalAckPayload;
    };

    if (!consumeData.success || !consumeData.payload) {
      return {
        success: false,
        err: { type: "unknown_error", error: "result_consume_failed: invalid or expired code" },
      };
    }

    return { success: true, data: consumeData.payload };
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
  redirectScheme: string,
  apiKey: string,
): string {
  const url = new URL("/mobile/sign", sdkEndpoint);
  url.searchParams.set("relay_code", relayCode);
  url.searchParams.set("redirect_scheme", redirectScheme);
  url.searchParams.set("host_origin", sdkEndpoint);
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}
