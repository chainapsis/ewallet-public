import type { Result } from "@keplr-ewallet/stdlib-js";

import type { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";

export async function initState(
  this: KeplrEWallet,
  hostOrigin: string,
): Promise<Result<boolean, string>> {
  try {
    const res = await this.sendMsgToIframe({
      target: "keplr_ewallet_attached",
      msg_type: "init_state",
      payload: hostOrigin,
    });

    if (res.msg_type === "init_state_ack") {
      return {
        success: true,
        data: true,
      };
    }

    return {
      success: false,
      err: "init_state_ack not received",
    };
  } catch (error) {
    console.error("[core] initState failed with error:", error);
    return {
      success: false,
      err: error instanceof Error ? error.message : String(error),
    };
  }
}
