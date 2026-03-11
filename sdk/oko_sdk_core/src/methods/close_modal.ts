import type { OkoWalletWebInterface } from "@oko-wallet-sdk-core/types";

export function closeModal(this: OkoWalletWebInterface) {
  this.iframe.style.display = "none";

  if (this.activePopupWindow) {
    try {
      if (!this.activePopupWindow.closed) {
        this.activePopupWindow.close();
      }
    } catch (error) {
      console.error("[oko] failed to close popup", error);
    }
  }

  this.activePopupWindow = null;
  this.activePopupId = null;
}
