import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { uploadKeyShares } from "@oko-wallet-attached/requests/rn_key_share_sync";

/**
 * Encrypts key shares from appState with the provided device_key
 * and uploads them to the proxy server.
 *
 * Called by the /rn/login/complete page after keygen completes.
 * Only runs in the OS browser context.
 */
export async function handleUploadKeyShares(
  ctx: MsgEventContext,
  payload: { device_key: string } | null,
): Promise<void> {
  const { port, hostOrigin } = ctx;

  if (!payload?.device_key) {
    port.postMessage({
      target: OKO_SDK_TARGET,
      msg_type: "upload_key_shares_ack",
      payload: { success: false, error: "missing_device_key" },
    });
    return;
  }

  try {
    await uploadKeyShares(payload.device_key, hostOrigin);

    port.postMessage({
      target: OKO_SDK_TARGET,
      msg_type: "upload_key_shares_ack",
      payload: { success: true },
    });
  } catch (error) {
    console.error("[attached] upload_key_shares error:", error);
    port.postMessage({
      target: OKO_SDK_TARGET,
      msg_type: "upload_key_shares_ack",
      payload: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
