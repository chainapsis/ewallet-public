import type {
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
  OpenModalError,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import { buildRpcUrl, parseRpcResultFromCallbackUrl } from "../codec/rpc_codec";
import {
  getServerRedirectScheme,
  openAuthSession,
} from "../native/OkoAuthBrowser";

export async function openModalRN(
  sdkEndpoint: string,
  msg: OkoWalletMsgOpenModal,
  redirectScheme: string,
  apiKey: string,
  expectedPublicKey?: string | null,
  clientRandom?: string | null,
  androidCallbackScheme?: string,
): Promise<Result<OpenModalAckPayload, OpenModalError>> {
  try {
    const serverScheme = getServerRedirectScheme(
      redirectScheme,
      androidCallbackScheme,
    );
    const { url: rpcUrl, stats } = buildRpcUrl(
      sdkEndpoint,
      "open_modal",
      msg.payload,
      apiKey,
      serverScheme,
      expectedPublicKey,
      clientRandom,
    );
    console.info("[oko-rn-rpc] open_modal request", {
      modalType: msg.payload.modal_type,
      modalId: msg.payload.modal_id,
      jsonBytes: stats.jsonBytes,
      compressedBytes: stats.compressedBytes,
      encodedChars: stats.encodedChars,
      rpcUrlChars: rpcUrl.length,
    });

    const authResult = await openAuthSession(
      rpcUrl,
      redirectScheme,
      androidCallbackScheme,
    );

    if (authResult.type === "cancel") {
      return {
        success: false,
        err: { type: "unknown_error", error: "user_cancelled" },
      };
    }

    const payload = parseRpcResultFromCallbackUrl<OpenModalAckPayload>(
      authResult.url,
    );
    return { success: true, data: payload };
  } catch (error) {
    return {
      success: false,
      err: { type: "unknown_error", error },
    };
  }
}
