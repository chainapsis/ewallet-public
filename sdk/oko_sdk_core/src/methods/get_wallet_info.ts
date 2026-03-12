import type {
  OkoWalletWebInterface,
  WalletInfo,
} from "@oko-wallet-sdk-core/types";
import { OKO_ATTACHED_TARGET } from "@oko-wallet-sdk-core/window_msg/target";

export async function getWalletInfo(
  this: OkoWalletWebInterface,
): Promise<WalletInfo | null> {
  await this.waitUntilInitialized;

  const res = await this.sendMsgToIframe({
    target: OKO_ATTACHED_TARGET,
    msg_type: "get_wallet_info",
    payload: null,
  });

  if (res.msg_type === "get_wallet_info_ack" && res.payload.success) {
    return res.payload.data;
  }

  return null;
}
