import type {
  OkoWalletMsgExportPrivateKeyAck,
  OkoWalletMsgGetAuthTypeAck,
} from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function handleExportPrivateKey(ctx: MsgEventContext) {
  const { port, hostOrigin } = ctx;
  const wallet = useAppState.getState().getWallet(hostOrigin);

  console.log(123123);

  // let payload = ["payload"];
  // if (wallet?.authType) {
  //   payload = {
  //     success: true,
  //     data: wallet.authType,
  //   };
  // } else {
  //   payload = {
  //     success: false,
  //     err: "No auth type found",
  //   };
  // }

  const ack: OkoWalletMsgExportPrivateKeyAck = {
    target: OKO_SDK_TARGET,
    msg_type: "export_private_key_ack",
    payload,
  };

  port.postMessage(ack);
}
