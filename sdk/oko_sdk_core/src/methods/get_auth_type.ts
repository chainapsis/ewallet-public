import type { OkoWalletWebInterface } from "@oko-wallet-sdk-core/types";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { OKO_ATTACHED_TARGET } from "@oko-wallet-sdk-core/window_msg/target";

export async function getAuthType(
  this: OkoWalletWebInterface,
): Promise<AuthType | null> {
  await this.waitUntilInitialized;

  const res = await this.sendMsgToIframe({
    target: OKO_ATTACHED_TARGET,
    msg_type: "get_auth_type",
    payload: null,
  });

  if (res.msg_type === "get_auth_type_ack" && res.payload.success) {
    return res.payload.data;
  }

  return null;
}
