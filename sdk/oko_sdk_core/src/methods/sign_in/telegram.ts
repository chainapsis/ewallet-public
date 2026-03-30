import type {
  OkoWalletMsg,
  OkoWalletMsgOAuthSignInUpdate,
  OkoWalletMsgOAuthSignInUpdateAck,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";

const FIVE_MINS_MS = 5 * 60 * 1000;

export async function handleTelegramSignIn(okoWallet: OkoWalletWebInterface) {
  const signInRes = await tryTelegramSignIn(
    okoWallet.apiKey,
    okoWallet.sendMsgToIframe.bind(okoWallet),
  );

  if (!signInRes.payload.success) {
    throw new Error(`sign in fail, err: ${signInRes.payload.err}`);
  }
}

// Open popup immediately to avoid Safari popup blocker,
// then request the OAuth URL from attached iframe.
async function tryTelegramSignIn(
  apiKey: string,
  sendMsgToIframe: (msg: OkoWalletMsg) => Promise<OkoWalletMsg>,
): Promise<OkoWalletMsgOAuthSignInUpdate> {
  const popup = window.open(
    "about:blank",
    "telegram_oauth",
    "width=1200,height=800",
  );

  if (!popup) {
    throw new Error("Failed to open new window for Telegram oauth sign in");
  }

  const ack = await sendMsgToIframe({
    target: "oko_attached",
    msg_type: "generate_oauth_url",
    payload: {
      provider: "telegram",
      apiKey,
      targetOrigin: window.location.origin,
    },
  });

  if (ack.msg_type !== "generate_oauth_url_ack" || !ack.payload.success) {
    popup.close();
    throw new Error("Failed to generate Telegram OAuth URL");
  }

  try {
    popup.location.href = ack.payload.data.url;
  } catch (error) {
    popup.close();
    throw new Error(
      `Failed to redirect popup to auth URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return new Promise<OkoWalletMsgOAuthSignInUpdate>((resolve, reject) => {
    let popupTimeoutTimer: number;
    let popupCloseCheckTimer: number;

    function onMessage(event: MessageEvent) {
      if (event.ports.length < 1) {
        return;
      }

      const port = event.ports[0];
      const data = event.data as OkoWalletMsg;

      if (data.msg_type === "oauth_sign_in_update") {
        const msg: OkoWalletMsgOAuthSignInUpdateAck = {
          target: "oko_attached",
          msg_type: "oauth_sign_in_update_ack",
          payload: null,
        };

        port.postMessage(msg);

        if (data.payload.success) {
          resolve(data);
        } else {
          reject(new Error(data.payload.err.type));
        }

        cleanup();
      }
    }

    window.addEventListener("message", onMessage);

    popupCloseCheckTimer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("Sign-in cancelled"));
      }
    }, 500);

    popupTimeoutTimer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timeout: no response within 5 minutes"));
      closePopup(popup);
    }, FIVE_MINS_MS);

    function cleanup() {
      window.clearTimeout(popupTimeoutTimer);
      window.clearInterval(popupCloseCheckTimer);
      window.removeEventListener("message", onMessage);
    }
  });
}

function closePopup(popup: Window) {
  if (popup && !popup.closed) {
    popup.close();
  }
}
