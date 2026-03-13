import type {
  OkoWalletMsgSetCodeVerifier,
  OkoWalletMsgSetCodeVerifierAck,
} from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { useAppState } from "@oko-wallet-attached/store/app";

export function handleSetCodeVerifier(
  ctx: MsgEventContext,
  message: OkoWalletMsgSetCodeVerifier,
) {
  const { port, hostOrigin } = ctx;

  if (!message.payload) {
    throw new Error("Code verifier is empty");
  }

  const appState = useAppState.getState();
  appState.setCodeVerifier(hostOrigin, message.payload);

  const ack: OkoWalletMsgSetCodeVerifierAck = {
    target: OKO_SDK_TARGET,
    msg_type: "set_code_verifier_ack",
    payload: {
      success: true,
      data: null,
    },
  };

  port.postMessage(ack);
}
