import type {
  OkoWalletMsg,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";

const TIMEOUT_MS = 30_000;

export async function sendMsgToIframe(
  this: OkoWalletWebInterface,
  msg: OkoWalletMsg,
): Promise<OkoWalletMsg> {
  await this.waitUntilInitialized;

  const contentWindow = this.iframe.contentWindow;
  if (contentWindow === null) {
    throw new Error("iframe contentWindow is null");
  }

  return new Promise<OkoWalletMsg>((resolve, reject) => {
    const channel = new MessageChannel();

    const timer = setTimeout(() => {
      channel.port1.onmessage = null;
      reject(
        new Error(
          `[oko] iframe response timeout (${TIMEOUT_MS}ms), msg_type: ${msg.msg_type}`,
        ),
      );
    }, TIMEOUT_MS);

    channel.port1.onmessage = (event: MessageEvent) => {
      clearTimeout(timer);

      const data = event.data as OkoWalletMsg;

      console.debug("[oko] reply recv", data);

      if (data.hasOwnProperty("payload")) {
        resolve(data);
      } else {
        console.error("[oko] unknown msg type");
        resolve({
          target: "oko_sdk",
          msg_type: "unknown_msg_type",
          payload: JSON.stringify(data),
        });
      }
    };

    contentWindow.postMessage(msg, this.sdkEndpoint, [channel.port2]);
  });
}
