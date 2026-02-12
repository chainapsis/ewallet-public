import type { OkoWalletInterface } from "@oko-wallet-sdk-core/types";
import { OKO_ATTACHED_TARGET } from "@oko-wallet-sdk-core/window_msg/target";

export async function exportPrivateKey(
  this: OkoWalletInterface,
): Promise<any | null> {
  await this.waitUntilInitialized;

  const res = await this.sendMsgToIframe({
    target: OKO_ATTACHED_TARGET,
    msg_type: "export_private_key",
    payload: null,
  });

  if (res.msg_type === "export_private_key_ack" && res.payload.success) {
    return res.payload.data;
  }

  return null;
}
