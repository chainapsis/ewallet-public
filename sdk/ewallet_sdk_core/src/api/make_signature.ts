import type { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import type {
  EWalletMsgMakeSignature,
  SignOutput,
} from "@keplr-ewallet-sdk-core/types";

export async function makeSignature(
  this: KeplrEWallet,
  msg: EWalletMsgMakeSignature,
): Promise<SignOutput> {
  const res = await this.sendMsgToIframe(msg);

  if (res.msg_type !== "make_signature_ack") {
    throw new Error("Unreachable");
  }

  if (!res.payload.success) {
    throw new Error(res.payload.err);
  }

  return res.payload.data;
}
