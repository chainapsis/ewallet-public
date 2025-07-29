import { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import type { EWalletMsg } from "@keplr-ewallet-sdk-core/types";

// 5 minutes
const WAIT_TIME = 300000;

export async function showModal(this: KeplrEWallet, msg: EWalletMsg) {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Show modal timeout")), WAIT_TIME);
  });

  this.iframe.style.display = "block";

  let showModalAck: EWalletMsg;

  try {
    showModalAck = await Promise.race([this.sendMsgToIframe(msg), timeout]);
  } catch (error) {
    if (error instanceof Error && error.message === "Show modal timeout") {
      await this.hideModal();
      throw new Error("Show modal timeout");
    }
    throw error;
  }

  return showModalAck;
}
