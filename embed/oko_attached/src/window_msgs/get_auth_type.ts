import type { OkoWalletMsgGetAuthTypeAck } from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function handleGetAuthType(ctx: MsgEventContext) {
  const { port, hostOrigin } = ctx;
  const wallet = useAppState.getState().getWallet(hostOrigin);

  let payload: OkoWalletMsgGetAuthTypeAck["payload"];
  if (wallet?.authType) {
    payload = {
      success: true,
      data: wallet.authType,
    };
  } else {
    payload = {
      success: false,
      err: "No auth type found",
    };
  }

  const ack: OkoWalletMsgGetAuthTypeAck = {
    target: OKO_SDK_TARGET,
    msg_type: "get_auth_type_ack",
    payload,
  };

  port.postMessage(ack);
}
