import type { OkoWalletWebInterface } from "@oko-wallet-sdk-core/types";
import { OKO_ATTACHED_TARGET } from "@oko-wallet-sdk-core/window_msg/target";

export async function getPublicKeyEd25519(
  this: OkoWalletWebInterface,
): Promise<string | null> {
  await this.waitUntilInitialized;

  const res = await this.sendMsgToIframe({
    target: OKO_ATTACHED_TARGET,
    msg_type: "get_public_key_ed25519",
    payload: null,
  });

  if (res.msg_type === "get_public_key_ed25519_ack" && res.payload.success) {
    return res.payload.data;
  }

  return null;
}
