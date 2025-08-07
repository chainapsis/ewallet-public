import { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import { EWALLET_ATTACHED_TARGET } from "@keplr-ewallet-sdk-core/window_msg/send_msg_to_iframe";

export async function getEmail(this: KeplrEWallet): Promise<string | null> {
  try {
    const res = await this.sendMsgToIframe({
      target: EWALLET_ATTACHED_TARGET,
      msg_type: "get_email",
      payload: null,
    });

    if (res.msg_type === "get_email_ack" && res.payload.success) {
      return res.payload.data;
    }

    return null;
  } catch (error) {
    console.error("[core] getEmail failed with error:", error);
    return null;
  }
}
