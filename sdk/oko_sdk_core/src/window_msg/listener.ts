import type { Result } from "@oko-wallet/stdlib-js";

import type {
  OkoWalletMsg,
  OkoWalletMsgInitAck,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";
import type { InitPayload } from "@oko-wallet-sdk-core/types/init";

export function registerMsgListener(
  _okoWallet: OkoWalletWebInterface,
): Promise<Result<InitPayload, string>> {
  if (window.__oko_ev) {
    // TODO: theoretically unreachable but this can happen
    // Later we will report to centralized logging system
    console.error("[oko] isn't it already initialized?");
  }

  return new Promise((resolve) => {
    async function handler(event: MessageEvent) {
      if (event.ports.length < 1) {
        // do nothing

        return;
      }

      const port = event.ports[0];
      const msg = event.data as OkoWalletMsg;

      if (msg.msg_type === "init") {
        const ack: OkoWalletMsgInitAck = {
          target: "oko_attached",
          msg_type: "init_ack",
          payload: { success: true, data: null },
        };

        port.postMessage(ack);

        window.removeEventListener("message", handler);

        resolve(msg.payload);
      } else {
      }
    }

    window.addEventListener("message", handler);
    window.__oko_ev = handler;
    console.log("[oko] msg listener registered");
  });
}
