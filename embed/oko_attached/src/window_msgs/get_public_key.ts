import type { OkoWalletMsgGetPublicKeyAck } from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function handleGetPublicKey(ctx: MsgEventContext) {
  const { port, hostOrigin } = ctx;
  const wallet = useAppState.getState().getWallet(hostOrigin);

  let payload: OkoWalletMsgGetPublicKeyAck["payload"];
  if (wallet?.publicKey) {
    payload = {
      success: true,
      data: wallet.publicKey,
    };
  } else {
    payload = {
      success: false,
      err: "No public key found",
    };
  }

  const ack: OkoWalletMsgGetPublicKeyAck = {
    target: OKO_SDK_TARGET,
    msg_type: "get_public_key_ack",
    payload,
  };

  port.postMessage(ack);
}
