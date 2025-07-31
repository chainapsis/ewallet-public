import { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";

export async function getEmail(this: KeplrEWallet) {
  try {
    const res = await this.sendMsgToIframe({
      msg_type: "get_email",
      payload: null,
    });

    if (res.msg_type === "get_email_ack") {
      return res.payload;
    }

    return null;
  } catch (error) {
    console.error("[core] getEmail failed with error:", error);
    return null;
  }
}
