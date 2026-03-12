import type { Result } from "@oko-wallet/stdlib-js";
import type {
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { OpenModalError } from "@oko-wallet/oko-sdk-core";
import {
  getServerRedirectScheme,
  openAuthSession,
} from "../native/OkoAuthBrowser";
import {
  buildRpcUrl,
  parseRpcResultFromCallbackUrl,
} from "../codec/rpc_codec";

export async function openModalRN(
  sdkEndpoint: string,
  msg: OkoWalletMsgOpenModal,
  redirectScheme: string,
  apiKey: string,
  expectedPublicKey?: string | null,
): Promise<Result<OpenModalAckPayload, OpenModalError>> {
  try {
    const serverScheme = getServerRedirectScheme(redirectScheme);
    const { url: rpcUrl, stats } = buildRpcUrl(
      sdkEndpoint,
      "open_modal",
      msg.payload,
      apiKey,
      serverScheme,
      expectedPublicKey,
    );
    console.info("[oko-rn-rpc] open_modal request", {
      modalType: msg.payload.modal_type,
      modalId: msg.payload.modal_id,
      jsonBytes: stats.jsonBytes,
      compressedBytes: stats.compressedBytes,
      encodedChars: stats.encodedChars,
      rpcUrlChars: rpcUrl.length,
    });

    const authResult = await openAuthSession(rpcUrl, redirectScheme);

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
