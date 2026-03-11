import { v4 as uuidv4 } from "uuid";

import { OKO_ATTACHED_TARGET } from "@oko-wallet-sdk-core/window_msg/target";
import type {
  OAuthState,
  OkoWalletWebInterface,
  OkoWalletMsg,
  OkoWalletMsgOAuthSignInUpdate,
  OkoWalletMsgOAuthSignInUpdateAck,
  OkoWalletMsgOpenModal,
} from "@oko-wallet-sdk-core/types";

import { generateNonce } from "./utils";

const TEN_MINS_MS = 10 * 60 * 1000;

export async function handleEmailSignIn(okoWallet: OkoWalletWebInterface) {
  const signInRes = await tryAuth0EmailSignIn(okoWallet);

  if (!signInRes.payload.success) {
    throw new Error(
      `sign in fail, err: ${signInRes.payload.err?.type ?? "unknown"}`,
    );
  }
}

async function tryAuth0EmailSignIn(
  okoWallet: OkoWalletWebInterface,
): Promise<OkoWalletMsgOAuthSignInUpdate> {
  const modalId = uuidv4();

  const oauthState: OAuthState = {
    apiKey: okoWallet.apiKey,
    targetOrigin: window.location.origin,
    provider: "auth0",
    modalId,
  };
  const oauthStateString = JSON.stringify(oauthState);

  console.debug("[oko] oauthStateString: %s", oauthStateString);

  const nonce = generateNonce();

  const modalMsg: OkoWalletMsgOpenModal = {
    target: OKO_ATTACHED_TARGET,
    msg_type: "open_modal",
    payload: {
      modal_type: "auth/email_login",
      modal_id: modalId,
      data: {
        email_hint: null,
        oauth: {
          nonce,
          state: oauthStateString,
        },
      },
    },
  };

  const oauthSignInUpdateWaiter = waitForOAuthSignInUpdate(okoWallet);

  const result = await okoWallet.openModal(modalMsg);
  if (!result.success) {
    oauthSignInUpdateWaiter.cancel();
    throw new Error(`email sign in open modal failed, err: ${result.err.type}`);
  }

  // User closed the email login modal or an error occurred before approval.
  if (
    result.data.modal_type === "auth/email_login" &&
    result.data.type !== "approve"
  ) {
    oauthSignInUpdateWaiter.cancel();
    const reason =
      result.data.type === "error" ? result.data.error.type : result.data.type;
    throw new Error(`email sign in open modal rejected, reason: ${reason}`);
  }

  return await oauthSignInUpdateWaiter.promise;
}

function waitForOAuthSignInUpdate(okoWallet: OkoWalletWebInterface) {
  let cleanup: (() => void) | null = null;

  const promise = new Promise<OkoWalletMsgOAuthSignInUpdate>(
    (resolve, reject) => {
      function onMessage(event: MessageEvent) {
        if (event.ports.length < 1) {
          return;
        }

        const port = event.ports[0];
        const data = event.data as OkoWalletMsg;

        if (data.msg_type === "oauth_sign_in_update") {
          console.log("[oko] oauth_sign_in_update recv, %o", data);

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

          cleanup?.();
          cleanup = null;
        }
      }

      window.addEventListener("message", onMessage);

      const timeout = window.setTimeout(() => {
        cleanup?.();
        cleanup = null;
        reject(new Error("Timeout: no response within 10 minutes"));
        okoWallet.closeModal();
      }, TEN_MINS_MS);

      cleanup = () => {
        console.log("[oko] clean up oauth sign in listener");
        window.clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };
    },
  );

  return {
    promise,
    cancel: () => {
      cleanup?.();
      cleanup = null;
    },
  };
}
