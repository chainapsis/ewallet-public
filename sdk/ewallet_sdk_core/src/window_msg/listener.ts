import type { EWalletMsg } from "@keplr-ewallet-sdk-core/types";

// Only used for "init" message which is triggered by the child.
// After initialization, message communication is only triggered
// by parent window and child replies on the dedicated channel
export function registerMsgListener(): Promise<boolean> {
  if (window.__keplr_ewallet_ev) {
    return Promise.resolve(false);
  }

  // Callback ref to remember
  const callback: ((b: boolean) => void)[] = [];
  const prom = new Promise<boolean>((resolve) => {
    callback.push(resolve);
  });

  async function msgHandler(event: MessageEvent) {
    const message = event.data as EWalletMsg;

    switch (message.msg_type) {
      case "init": {
        if (callback.length > 1) {
          throw new Error("Callback should exist");
        }

        const cb = callback[0];
        cb(true);
      }
    }
  }

  window.addEventListener("message", msgHandler);
  window.__keplr_ewallet_ev = msgHandler;

  console.info("SDK msg listener is registered");

  return prom;
}
