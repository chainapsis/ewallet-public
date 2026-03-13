import type {
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
  OpenModalError,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import {
  getServerRedirectScheme,
  openAuthSession,
} from "../native/OkoAuthBrowser";
import {
  decodeSignResultFromCallbackUrl,
  encodeSignRequestPayloadWithStats,
  SIGN_URL_CODEC_VERSION,
  SIGN_URL_REQUEST_PARAM,
  SIGN_URL_VERSION_PARAM,
} from "./sign_url_codec";

export async function openModalRN(
  sdkEndpoint: string,
  msg: OkoWalletMsgOpenModal,
  redirectScheme: string,
  apiKey: string,
): Promise<Result<OpenModalAckPayload, OpenModalError>> {
  try {
    const serverScheme = getServerRedirectScheme(redirectScheme);
    const { encoded: encodedPayload, stats } =
      encodeSignRequestPayloadWithStats(msg.payload);
    const signUrl = buildSignUrl(
      sdkEndpoint,
      encodedPayload,
      apiKey,
      serverScheme,
    );
    console.info("[oko-rn-sign-size] request", {
      modalType: msg.payload.modal_type,
      modalId: msg.payload.modal_id,
      jsonBytes: stats.jsonBytes,
      compressedBytes: stats.compressedBytes,
      encodedChars: stats.encodedChars,
      signUrlChars: signUrl.length,
    });
    const authResult = await openAuthSession(signUrl, redirectScheme);

    if (authResult.type === "cancel") {
      return {
        success: false,
        err: { type: "unknown_error", error: "user_cancelled" },
      };
    }

    const payload = decodeSignResultFromCallbackUrl(authResult.url);
    return { success: true, data: payload };
  } catch (error) {
    return {
      success: false,
      err: { type: "unknown_error", error },
    };
  }
}

function buildSignUrl(
  sdkEndpoint: string,
  encodedPayload: string,
  apiKey: string,
  redirectScheme: string,
): string {
  const url = new URL("/mobile/sign", sdkEndpoint);
  url.searchParams.set("host_origin", sdkEndpoint);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("redirect_scheme", redirectScheme);
  const hashParams = new URLSearchParams();
  hashParams.set(SIGN_URL_VERSION_PARAM, SIGN_URL_CODEC_VERSION);
  hashParams.set(SIGN_URL_REQUEST_PARAM, encodedPayload);
  url.hash = hashParams.toString();
  return url.toString();
}
