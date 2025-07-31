import type { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";

export async function signOut(this: KeplrEWallet) {
  await this.sendMsgToIframe({
    msg_type: "sign_out",
    payload: null,
  });
}
