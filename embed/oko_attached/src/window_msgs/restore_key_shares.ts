import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { downloadAndRestoreKeyShares } from "@oko-wallet-attached/requests/rn_key_share_sync";

/**
 * Downloads encrypted key shares from the proxy server, decrypts them
 * with the provided device_key, and restores them into appState.
 *
 * Called by the /rn/sign page before presenting the signing modal.
 * Only runs in the OS browser context.
 */
export async function handleRestoreKeyShares(
  ctx: MsgEventContext,
  payload: { device_key: string } | null,
): Promise<void> {
  const { port, hostOrigin } = ctx;

  if (!payload?.device_key) {
    port.postMessage({
      target: OKO_SDK_TARGET,
      msg_type: "restore_key_shares_ack",
      payload: { success: false, error: "missing_device_key" },
    });
    return;
  }

  try {
    await downloadAndRestoreKeyShares(payload.device_key, hostOrigin);

    port.postMessage({
      target: OKO_SDK_TARGET,
      msg_type: "restore_key_shares_ack",
      payload: { success: true },
    });
  } catch (error) {
    console.error("[attached] restore_key_shares error:", error);
    port.postMessage({
      target: OKO_SDK_TARGET,
      msg_type: "restore_key_shares_ack",
      payload: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
