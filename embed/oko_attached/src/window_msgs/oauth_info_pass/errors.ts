import type {
  OAuthSignInError,
  OkoWalletMsgOAuthInfoPass,
  OkoWalletMsgOAuthSignInUpdate,
} from "@oko-wallet/oko-sdk-core";

import { postLog } from "@oko-wallet-attached/requests/logging";
import { sendMsgToWindow } from "@oko-wallet-attached/window_msgs/send";
import { OKO_SDK_TARGET } from "@oko-wallet-attached/window_msgs/target";

export async function bail(
  message: OkoWalletMsgOAuthInfoPass,
  err: OAuthSignInError,
) {
  postLog(
    {
      level: "error",
      message: "[attached] handling oauth sign-in fail",
      error: {
        name: "oauth_sign_in_error",
        message: JSON.stringify(err),
      },
    },
    { console: true },
  );

  const updateMsg: OkoWalletMsgOAuthSignInUpdate = {
    target: OKO_SDK_TARGET,
    msg_type: "oauth_sign_in_update",
    payload: { success: false, err },
  };

  const hostOrigin = message.payload.target_origin;
  await sendMsgToWindow(window.parent, updateMsg, hostOrigin);
}
