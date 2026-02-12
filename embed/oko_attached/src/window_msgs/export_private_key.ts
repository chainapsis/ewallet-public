import type {
  OkoWalletMsgExportPrivateKeyAck,
  OkoWalletMsgGetAuthTypeAck,
} from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { OKO_API_ENDPOINT } from "@oko-wallet-attached/requests/endpoints";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function handleExportPrivateKey(ctx: MsgEventContext) {
  const { port, hostOrigin } = ctx;

  // const wallet = useAppState.getState().getWallet(hostOrigin);

  const appState = useAppState.getState();
  const keyshare_1 = appState.getKeyshare_1(hostOrigin);
  const authToken = appState.getAuthToken(hostOrigin);

  console.log(1, keyshare_1, authToken);

  // const response = await fetch(
  //   `${OKO_API_ENDPOINT}/user_dashboard/v1/get_connected_apps`,
  //   {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${authToken}`,
  //     },
  //   },
  // );

  const ack: OkoWalletMsgExportPrivateKeyAck = {
    target: OKO_SDK_TARGET,
    msg_type: "export_private_key_ack",
    payload: {
      success: true,
      data: {
        secp256k1: null,
        ed25519: null,
      },
    },
  };

  port.postMessage(ack);
}
