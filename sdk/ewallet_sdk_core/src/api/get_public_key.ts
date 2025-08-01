import type { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import { EWALLET_ATTACHED_TARGET } from "@keplr-ewallet-sdk-core/window_msg/send_msg_to_iframe";

export async function getPublicKey(this: KeplrEWallet) {
  try {
    const res = await this.sendMsgToIframe({
      target: EWALLET_ATTACHED_TARGET,
      msg_type: "get_public_key",
      payload: null,
    });

    if (res.msg_type === "get_public_key_ack") {
      return res.payload;
    }

    return null;
  } catch (error) {
    console.error("[core] getPublicKey failed with error:", error);
    return null;
  }
}
