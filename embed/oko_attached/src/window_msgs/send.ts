import type { OkoWalletMsg } from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";

const TIMEOUT_MS = 30_000;

export function sendMsgToWindow(
  window: Window,
  msg: OkoWalletMsg,
  targetOrigin: string,
) {
  return new Promise<OkoWalletMsg>((resolve, reject) => {
    const channel = new MessageChannel();

    const timer = setTimeout(() => {
      channel.port1.onmessage = null;
      reject(
        new Error(
          `[oko] window message timeout (${TIMEOUT_MS}ms), msg_type: ${msg.msg_type}`,
        ),
      );
    }, TIMEOUT_MS);

    channel.port1.onmessage = (obj: any) => {
      clearTimeout(timer);

      const data = obj.data as OkoWalletMsg;

      channel.port1.close();

      if (data.hasOwnProperty("payload")) {
        resolve(data);
      } else {
        resolve({
          target: OKO_SDK_TARGET,
          msg_type: "unknown_msg_type",
          payload: JSON.stringify(data),
        });
      }
    };

    window.postMessage(msg, targetOrigin, [channel.port2]);
  });
}
