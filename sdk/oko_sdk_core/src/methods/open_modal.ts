import type { Result } from "@oko-wallet/stdlib-js";

import type { OpenModalError } from "@oko-wallet-sdk-core/errors";
import type {
  OkoWalletMsg,
  OkoWalletMsgOpenModal,
  OkoWalletWebInterface,
  OpenModalAckPayload,
} from "@oko-wallet-sdk-core/types";

const TEN_MINS = 60 * 10 * 1000;
const POPUP_READY_TIMEOUT = 30 * 1000;

interface PopupContext {
  id: string;
  popupWindow: Window;
  waitUntilReady: Promise<void>;
}

export async function openModal(
  this: OkoWalletWebInterface,
  msg: OkoWalletMsgOpenModal,
): Promise<Result<OpenModalAckPayload, OpenModalError>> {
  const emailLogin = msg.payload.modal_type === "auth/email_login";
  const telegramLogin = msg.payload.modal_type === "auth/telegram_login";
  let popupContext: PopupContext | null = null;

  if (emailLogin) {
    popupContext = openEmailLoginPopup.call(this, msg);
    this.activePopupId = popupContext.id;
    this.activePopupWindow = popupContext.popupWindow;
  }

  if (telegramLogin) {
    popupContext = openTelegramLoginPopup.call(this, msg);
    this.activePopupId = popupContext.id;
    this.activePopupWindow = popupContext.popupWindow;
  }

  await this.waitUntilInitialized;

  if (!emailLogin && !telegramLogin) {
    this.iframe.style.display = "block";
  }

  const { timeoutPromise, cancelTimeout } = createTimeout(TEN_MINS);

  try {
    if (popupContext) {
      try {
        await popupContext.waitUntilReady;
      } catch (error) {
        if (popupContext.popupWindow && !popupContext.popupWindow.closed) {
          popupContext.popupWindow.close();
        }
        throw error;
      }
    }

    const openModalAck = await Promise.race([
      popupContext
        ? sendMsgToPopupWindow(
            popupContext.popupWindow,
            msg,
            this.sdkEndpoint,
            popupContext.id,
          )
        : this.sendMsgToIframe(msg),
      timeoutPromise,
    ]);

    cancelTimeout();

    if (openModalAck.msg_type !== "open_modal_ack") {
      return {
        success: false,
        err: { type: "invalid_ack_type", received: openModalAck.msg_type },
      };
    }

    return { success: true, data: openModalAck.payload };
  } catch (error) {
    return { success: false, err: { type: "unknown_error", error } };
  } finally {
    cancelTimeout();
    this.closeModal();
  }
}

function openEmailLoginPopup(
  this: OkoWalletWebInterface,
  msg: OkoWalletMsgOpenModal,
): PopupContext {
  const modalId =
    "modal_id" in msg.payload
      ? msg.payload.modal_id
      : `oko_modal_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Open popup immediately to avoid Safari popup blocker
  // Use a blank page first, then redirect after nonce is set
  const width = 440;
  const height = 285;
  const left = Math.max((window.screen.width - width) / 2, 0);
  const top = Math.max((window.screen.height - height) / 2, 0);

  const popupWindow = window.open(
    "about:blank",
    modalId,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes`,
  );

  if (!popupWindow) {
    throw new Error("Failed to open popup window");
  }

  const popupOrigin = new URL(this.sdkEndpoint).origin;

  // Wait for nonce to be set, then redirect popup to actual email login URL
  const waitUntilReady = (async () => {
    if (
      msg.payload.modal_type === "auth/email_login" &&
      "data" in msg.payload &&
      msg.payload.data?.oauth?.nonce
    ) {
      const nonce = msg.payload.data.oauth.nonce;
      const nonceAckPromise = this.sendMsgToIframe({
        target: "oko_attached",
        msg_type: "set_oauth_nonce",
        payload: nonce,
      });

      const nonceAck = await nonceAckPromise;
      if (
        nonceAck.msg_type !== "set_oauth_nonce_ack" ||
        !nonceAck.payload.success
      ) {
        popupWindow.close();
        throw new Error("Failed to set nonce for email oauth sign in");
      }
    }

    // Redirect popup to actual email login URL
    const url = new URL("/email", this.sdkEndpoint);
    url.searchParams.set("modal_id", modalId);
    url.searchParams.set("host_origin", window.location.origin);

    if (this._theme) {
      url.searchParams.set("theme", this._theme);
    }

    try {
      popupWindow.location.href = url.toString();
    } catch (error) {
      popupWindow.close();
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to redirect popup: ${errorMsg}`);
    }

    // Wait for popup to be ready
    await waitForPopupReady(modalId, popupWindow, popupOrigin);
  })();

  return {
    id: modalId,
    popupWindow,
    waitUntilReady,
  };
}

function openTelegramLoginPopup(
  this: OkoWalletWebInterface,
  msg: OkoWalletMsgOpenModal,
): PopupContext {
  const modalId =
    "modal_id" in msg.payload
      ? msg.payload.modal_id
      : `oko_telegram_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const url = new URL("/telegram", this.sdkEndpoint);

  url.searchParams.set("modal_id", modalId);
  url.searchParams.set("host_origin", window.location.origin);

  if (this._theme) {
    url.searchParams.set("theme", this._theme);
  }

  if (
    msg.payload.modal_type === "auth/telegram_login" &&
    "data" in msg.payload &&
    msg.payload.data?.state
  ) {
    url.searchParams.set("state", msg.payload.data.state);
  }

  const width = 440;
  const height = 402;
  const left = Math.max((window.screen.width - width) / 2, 0);
  const top = Math.max((window.screen.height - height) / 2, 0);

  const popupWindow = window.open(
    url.toString(),
    modalId,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );

  if (!popupWindow) {
    throw new Error("Failed to open popup window");
  }

  const popupOrigin = new URL(this.sdkEndpoint).origin;

  return {
    id: modalId,
    popupWindow,
    waitUntilReady: waitForPopupReady(modalId, popupWindow, popupOrigin),
  };
}

function waitForPopupReady(
  modalId: string,
  popupWindow: Window,
  popupOrigin: string,
) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Popup did not initialize in time"));
    }, POPUP_READY_TIMEOUT);

    const closeWatcher = window.setInterval(() => {
      if (popupWindow.closed) {
        cleanup();
        reject(new Error("Popup closed before it was ready"));
      }
    }, 500);

    function cleanup() {
      window.clearTimeout(timeoutId);
      window.clearInterval(closeWatcher);
      window.removeEventListener("message", onMessage);
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== popupOrigin) {
        return;
      }

      const data = event.data as {
        target?: string;
        msg_type?: string;
        payload?: { modal_id?: string };
      };

      if (
        data?.target === "oko_attached_popup" &&
        data.msg_type === "popup_ready" &&
        data.payload?.modal_id === modalId
      ) {
        cleanup();
        resolve();
      }
    }

    window.addEventListener("message", onMessage);
  });
}

function sendMsgToPopupWindow(
  popupWindow: Window,
  msg: OkoWalletMsgOpenModal,
  sdkEndpoint: string,
  modalId: string,
) {
  const targetOrigin = new URL(sdkEndpoint).origin;

  return new Promise<OkoWalletMsg>((resolve, reject) => {
    if (!popupWindow || popupWindow.closed) {
      reject(new Error("Popup window is closed"));
      return;
    }

    const channel = new MessageChannel();
    let resolved = false;

    const closeWatcher = window.setInterval(() => {
      if (popupWindow.closed && !resolved) {
        window.clearInterval(closeWatcher);
        // Grace period: allow pending postMessage events to be processed
        // before rejecting (the callback posts open_modal_ack right before
        // calling window.close()).
        setTimeout(() => {
          if (!resolved) {
            cleanup();
            reject(new Error("Popup closed before responding"));
          }
        }, 100);
      }
    }, 500);

    function cleanup() {
      channel.port1.close();
      window.clearInterval(closeWatcher);
      window.removeEventListener("message", onPostMessage);
    }

    // Handle response via MessageChannel port
    channel.port1.onmessage = (event: MessageEvent) => {
      const data = event.data as OkoWalletMsg;
      resolved = true;
      cleanup();
      resolve(data);
    };

    // Also handle response via regular postMessage (fallback for Auth0 callback)
    function onPostMessage(event: MessageEvent) {
      if (event.origin !== targetOrigin) {
        return;
      }

      const data = event.data as OkoWalletMsg;
      if (
        data.target === "oko_sdk" &&
        data.msg_type === "open_modal_ack" &&
        (data.payload?.modal_type === "auth/email_login" ||
          data.payload?.modal_type === "auth/telegram_login") &&
        "modal_id" in data.payload &&
        (() => {
          const expectedModalId =
            "modal_id" in msg.payload ? msg.payload.modal_id : modalId;
          return (
            data.payload.modal_id === expectedModalId ||
            data.payload.modal_id === modalId
          );
        })()
      ) {
        resolved = true;
        cleanup();
        resolve(data);
      }
    }

    window.addEventListener("message", onPostMessage);

    try {
      popupWindow.postMessage(msg, targetOrigin, [channel.port2]);
    } catch (error) {
      cleanup();
      reject(
        error instanceof Error
          ? error
          : new Error("Failed to send message to popup"),
      );
    }
  });
}

function createTimeout(duration: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    timeoutPromise: new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Show modal timeout"));
      }, duration);
    }),
    cancelTimeout: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}
