import type { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import type { EWalletMsg } from "@keplr-ewallet-sdk-core/types";

export const EWALLET_ATTACHED_TARGET = "keplr_ewallet_attached";

export function sendMsgToIframe(this: KeplrEWallet, msg: EWalletMsg) {
  return new Promise<EWalletMsg>((resolve, reject) => {
    if (this.iframe.contentWindow === null) {
      reject("iframe contentWindow is null");

      return;
    }

    const contentWindow = this.iframe.contentWindow;

    const channel = new MessageChannel();

    channel.port1.onmessage = (obj: any) => {
      const data = obj.data as EWalletMsg;

      console.log("[keplr] reply recv", data);

      if (data.hasOwnProperty("payload")) {
        resolve(data);
      } else {
        console.error("[keplr] unknown msg type");

        resolve({
          target: "keplr_ewallet_sdk",
          msg_type: "unknown_msg_type",
          payload: JSON.stringify(data),
        });
      }
    };

    contentWindow.postMessage(msg, this.attachedEndpoint, [channel.port2]);
  });
}
