import { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import {
  type OAuthState,
  RedirectUriSearchParamsKey,
} from "@keplr-ewallet-sdk-core/oauth";
import { EWALLET_ATTACHED_TARGET } from "@keplr-ewallet-sdk-core/window_msg/send_msg_to_iframe";

const GoogleClientId =
  "239646646986-8on7ql1vmbcshbjk12bdtopmto99iipm.apps.googleusercontent.com";

// TODO:should be given programatically
const IframeOrigin = "http://localhost:3201/";

export async function tryGoogleSignIn(
  customerId: string,
  sendMsgToIframe: KeplrEWallet["sendMsgToIframe"],
) {
  const clientId = GoogleClientId;
  const redirectUri = `${new URL(IframeOrigin).origin}/google/callback`;

  console.log("window host: %s", window.location.host);
  console.log("redirectUri: %s", redirectUri);

  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // NOTE: safari browser block the new window when async operation is used
  // between user interaction and window opening.
  // so we need to send the message to iframe first and wait for the ack after window opening.
  const ackPromise = sendMsgToIframe({
    target: EWALLET_ATTACHED_TARGET,
    msg_type: "set_oauth_nonce",
    payload: nonce,
  });

  const oauthState: OAuthState = {
    customerId,
    targetOrigin: window.location.origin,
  };
  const oauthStateString = JSON.stringify(oauthState);

  console.log("oauthStateString: %s", oauthStateString);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  // Google implicit auth flow
  // See https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
  authUrl.searchParams.set("response_type", "token id_token");

  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("prompt", "login");
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set(RedirectUriSearchParamsKey.STATE, oauthStateString);

  const popup = window.open(
    authUrl.toString(),
    "google_oauth",
    "width=1200,height=800",
  );

  if (!popup) {
    throw new Error("Failed to open new window for google oauth sign in");
  }

  const ack = await ackPromise;
  if (ack.msg_type !== "set_oauth_nonce_ack" || ack.payload !== "ok") {
    popup.close();
    throw new Error("Failed to set nonce for google oauth sign in");
  }

  return new Promise<void>((resolve, reject) => {
    let focusTimer: number;
    let timeoutId: number;

    function onFocus(e: FocusEvent) {
      // when user focus back to the parent window, check if the popup is closed
      // a small delay to handle the case message is sent but not received yet
      focusTimer = window.setTimeout(() => {
        if (popup && popup.closed) {
          cleanup();
          reject(new Error("Window closed by user"));
        }
      }, 200);
    }
    window.addEventListener("focus", onFocus);

    function onMessage(e: MessageEvent) {
      if (e.data?.msg_type === "oauth_sign_in_ack") {
        cleanup();
        resolve();
      }
    }
    window.addEventListener("message", onMessage);

    timeoutId = window.setTimeout(
      () => {
        cleanup();
        reject(new Error("Timeout: no response within 5 minutes"));
      },
      5 * 60 * 1000,
    );

    function cleanup() {
      window.clearTimeout(focusTimer);
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("message", onMessage);
      if (popup && !popup.closed) {
        popup.close();
      }
    }
  });
}
