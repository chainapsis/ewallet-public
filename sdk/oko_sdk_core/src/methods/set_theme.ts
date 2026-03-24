import type {
  OkoWalletMsgSetTheme,
  OkoWalletTheme,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";

export async function setTheme(
  this: OkoWalletWebInterface,
  theme: OkoWalletTheme,
) {
  this._theme = theme;

  await this.waitUntilInitialized;

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

  if (this.activePopupWindow && !this.activePopupWindow.closed) {
    this.activePopupWindow.postMessage(msg, this.sdkEndpoint);
  }
}
