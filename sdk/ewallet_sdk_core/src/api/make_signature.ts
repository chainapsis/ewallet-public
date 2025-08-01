import type { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import type {
  EWalletMakeSignatureAckPayload,
  EWalletMsgMakeSignature,
} from "@keplr-ewallet-sdk-core/types";

export async function makeSignature(
  this: KeplrEWallet,
  msg: EWalletMsgMakeSignature,
): Promise<EWalletMakeSignatureAckPayload | null> {
  try {
    const res = await this.sendMsgToIframe(msg);

    if (res.msg_type === "make_signature_ack") {
      return res.payload;
    }

    return null;
  } catch (error) {
    console.error("[core] makeSignature failed with error:", error);
    return null;
  }
}
