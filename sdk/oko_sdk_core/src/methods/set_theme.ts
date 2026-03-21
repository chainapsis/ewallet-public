import type {
  OkoWalletMsgSetTheme,
  OkoWalletTheme,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";

export function setTheme(this: OkoWalletWebInterface, theme: OkoWalletTheme) {
  const contentWindow = this.iframe.contentWindow;
  if (contentWindow === null) {
    console.warn("[oko] setTheme: iframe contentWindow is null");
    return;
  }

  const msg: OkoWalletMsgSetTheme = {
    target: "oko_attached",
    msg_type: "set_theme",
    payload: { theme },
  };

  contentWindow.postMessage(msg, this.sdkEndpoint);
}
