import type {
  OkoWalletMsgSetOAuthNonce,
  OkoWalletMsgSetOAuthNonceAck,
} from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { useAppState } from "@oko-wallet-attached/store/app";

export function handleSetOAuthNonce(
  ctx: MsgEventContext,
  message: OkoWalletMsgSetOAuthNonce,
) {
  const { port, hostOrigin } = ctx;

  if (!message.payload) {
    throw new Error("Nonce is empty");
  }

  const appState = useAppState.getState();
  appState.setNonce(hostOrigin, message.payload);

  const ack: OkoWalletMsgSetOAuthNonceAck = {
    target: OKO_SDK_TARGET,
    msg_type: "set_oauth_nonce_ack",
    payload: {
      success: true,
      data: null,
    },
  };

  port.postMessage(ack);
}
