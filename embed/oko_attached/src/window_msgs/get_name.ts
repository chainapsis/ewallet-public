import type { OkoWalletMsgGetNameAck } from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function handleGetName(ctx: MsgEventContext) {
  const { port, hostOrigin } = ctx;
  const wallet = useAppState.getState().getWallet(hostOrigin);

  let payload: OkoWalletMsgGetNameAck["payload"];
  if (wallet?.name) {
    payload = {
      success: true,
      data: wallet.name,
    };
  } else {
    payload = {
      success: false,
      err: "No name found",
    };
  }

  const ack: OkoWalletMsgGetNameAck = {
    target: OKO_SDK_TARGET,
    msg_type: "get_name_ack",
    payload,
  };
  port.postMessage(ack);
}
