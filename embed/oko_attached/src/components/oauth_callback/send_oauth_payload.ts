import type {
  OAuthPayload,
  OAuthTokenRequestPayload,
  OkoWalletMsg,
  OkoWalletMsgOAuthInfoPass,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import type {
  HandleCallbackError,
  SendMsgToEmbeddedWindowError,
} from "@oko-wallet-attached/components/google_callback/types";
import { sendMsgToWindow } from "@oko-wallet-attached/window_msgs/send";
import { OAUTH_BROADCAST_CHANNEL } from "@oko-wallet-attached/window_msgs/target";

export async function sendOAuthPayloadToEmbeddedWindow(
  payload: OAuthPayload | OAuthTokenRequestPayload,
): Promise<Result<void, HandleCallbackError>> {
  const msg: OkoWalletMsgOAuthInfoPass = {
    target: "oko_attached",
    msg_type: "oauth_info_pass",
    payload,
  };

  const sendRes = window.opener
    ? await sendMsgToEmbeddedWindow(msg)
    : await sendMsgViaBroadcastChannel(msg);

  if (!sendRes.success) {
    return {
      success: false,
      err: {
        type: "msg_pass_fail",
        error: sendRes.err.type,
      },
    };
  }

  const ack = sendRes.data;

  if (ack.msg_type !== "oauth_info_pass_ack") {
    return {
      success: false,
      err: { type: "wrong_ack_type", msg_type: ack.msg_type },
    };
  }

  return { success: true, data: void 0 };
}

async function sendMsgToEmbeddedWindow(
  msg: OkoWalletMsgOAuthInfoPass,
): Promise<Result<OkoWalletMsg, SendMsgToEmbeddedWindowError>> {
  const attachedURL = window.location.toString();

  // NOTE:
  // As of 2025 Dec, iframe embedded in the host window is the same
  // web application "oko_attached", served from the same URL
  const targetOrigin = new URL(attachedURL).origin;

  for (let idx = 0; idx < window.opener.frames.length; idx += 1) {
    try {
      const frame = window.opener.frames[idx];
      if (frame.location.origin === targetOrigin) {
        try {
          const ack = await sendMsgToWindow(frame, msg, targetOrigin);

          return { success: true, data: ack };
        } catch (err: any) {
          return {
            success: false,
            err: { type: "send_to_parent_fail", error: err.toString() },
          };
        }
      }
    } catch (_err: any) {
      console.log(`parent window's iframe not ours, idx: ${idx}`);
    }
  }

  return {
    success: false,
    err: {
      type: "window_not_found",
    },
  };
}

/**
 * Fallback for Safari (iOS) where window.opener is null after cross-origin
 * OAuth navigation. Uses BroadcastChannel to communicate with the attached
 * iframe on the same origin.
 */
async function sendMsgViaBroadcastChannel(
  msg: OkoWalletMsgOAuthInfoPass,
): Promise<Result<OkoWalletMsg, SendMsgToEmbeddedWindowError>> {
  return new Promise((resolve) => {
    const bc = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);

    const timeout = setTimeout(() => {
      bc.close();
      resolve({
        success: false,
        err: { type: "window_not_found" },
      });
    }, 30_000);

    bc.onmessage = (event) => {
      const data = event.data as OkoWalletMsg;

      if (data.msg_type === "oauth_info_pass_ack") {
        clearTimeout(timeout);
        bc.close();
        resolve({ success: true, data });
      }
    };

    bc.postMessage(msg);
  });
}
