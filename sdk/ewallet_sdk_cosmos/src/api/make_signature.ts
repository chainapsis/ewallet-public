import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

export async function makeSignature(
  this: CosmosEWallet,
  signDocHash: Uint8Array,
) {
  try {
    const makeSignatureAck = await this.eWallet.sendMsgToIframe({
      msg_type: "make_signature",
      payload: { msg: signDocHash },
    });

    if (makeSignatureAck.msg_type !== "make_signature_ack") {
      throw new Error("Can't receive make_signature_ack from ewallet");
    }

    return makeSignatureAck.payload;
  } catch (error) {
    throw error;
  }
}
