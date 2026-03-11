import type { Result } from "@oko-wallet/stdlib-js";
import type {
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { OpenModalError } from "@oko-wallet/oko-sdk-core";
import {
  openAuthSession,
  getServerRedirectScheme,
} from "../native/OkoAuthBrowser";

export async function openModalRN(
  sdkEndpoint: string,
  msg: OkoWalletMsgOpenModal,
  redirectScheme: string,
  apiKey: string,
): Promise<Result<OpenModalAckPayload, OpenModalError>> {
  try {
    const storeRes = await fetch(`${sdkEndpoint}/api/mobile/sign-relay/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: msg.payload }),
    });

    if (!storeRes.ok) {
      return {
        success: false,
        err: {
          type: "unknown_error",
          error: `relay_store_failed: HTTP ${storeRes.status}`,
        },
      };
    }

    const storeData = (await storeRes.json()) as {
      success: boolean;
      code?: string;
    };

    if (!storeData.success || !storeData.code) {
      return {
        success: false,
        err: {
          type: "unknown_error",
          error: "relay_store_failed: no code returned",
        },
      };
    }

    const relayCode = storeData.code;
    const resultKey = `result:${relayCode}`;

    const serverScheme = getServerRedirectScheme(redirectScheme);
    const signUrl = buildSignUrl(sdkEndpoint, relayCode, apiKey, serverScheme);
    const authResult = await openAuthSession(signUrl, redirectScheme);

    if (authResult.type === "cancel") {
      return {
        success: false,
        err: { type: "unknown_error", error: "user_cancelled" },
      };
    }

    const payload = await fetchRelayResult(sdkEndpoint, resultKey);
    return { success: true, data: payload };
  } catch (error) {
    return {
      success: false,
      err: { type: "unknown_error", error },
    };
  }
}

async function fetchRelayResult(
  sdkEndpoint: string,
  code: string,
  maxRetries = 10,
  delayMs = 500,
): Promise<OpenModalAckPayload> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(
        `${sdkEndpoint}/api/mobile/sign-relay/result-consume`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        },
      );
      const data = (await res.json()) as {
        success: boolean;
        payload?: OpenModalAckPayload;
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
  throw new Error("Failed to retrieve signing result from relay");
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
