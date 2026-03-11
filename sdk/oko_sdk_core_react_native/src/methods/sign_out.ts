import type { OkoWalletMsg } from "@oko-wallet/oko-sdk-core";
import type { WebViewBridge } from "../bridge/WebViewBridge";

export async function signOutRN(bridge: WebViewBridge): Promise<void> {
  const ack = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "sign_out",
    payload: null,
  } as OkoWalletMsg);

  if (ack.msg_type !== "sign_out_ack") {
    throw new Error(`sign_out failed: unexpected ack type ${ack.msg_type}`);
  }
}
