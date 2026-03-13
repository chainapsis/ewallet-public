import type { OkoWalletMsgGetEmailAck } from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function handleGetEmail(ctx: MsgEventContext) {
  const { port, hostOrigin } = ctx;
  const wallet = useAppState.getState().getWallet(hostOrigin);

  let payload: OkoWalletMsgGetEmailAck["payload"];
  if (wallet?.email) {
    payload = {
      success: true,
      data: wallet.email,
    };
  } else {
    payload = {
      success: false,
      err: "No email found",
    };
  }

  const ack: OkoWalletMsgGetEmailAck = {
    target: OKO_SDK_TARGET,
    msg_type: "get_email_ack",
    payload,
  };
  port.postMessage(ack);
}
