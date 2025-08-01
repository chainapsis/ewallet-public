import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

export async function makeSignature(
  this: CosmosEWallet,
  signDocHash: Uint8Array,
) {
  try {
    const makeSignatureResponse = await this.eWallet.makeSignature({
      msg_type: "make_signature",
      payload: { msg: signDocHash },
    });
    if (!makeSignatureResponse) {
      throw new Error("Failed to make signature");
    }

    return makeSignatureResponse;
  } catch (error) {
    throw error;
  }
}
