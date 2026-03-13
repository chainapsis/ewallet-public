import type { OkoWalletMsgGetWalletInfoAck } from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function handleGetWalletInfo(ctx: MsgEventContext) {
  const { port, hostOrigin } = ctx;
  const wallet = useAppState.getState().getWallet(hostOrigin);

  let payload: OkoWalletMsgGetWalletInfoAck["payload"];
  if (wallet) {
    payload = {
      success: true,
      data: {
        authType: wallet.authType,
        publicKey: wallet.publicKey,
        email: wallet.email ?? null,
        name: wallet.name ?? null,
      },
    };
  } else {
    payload = {
      success: false,
      err: "No wallet found",
    };
  }

  const ack: OkoWalletMsgGetWalletInfoAck = {
    target: OKO_SDK_TARGET,
    msg_type: "get_wallet_info_ack",
    payload,
  };
  port.postMessage(ack);
}
