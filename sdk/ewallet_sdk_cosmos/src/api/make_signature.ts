import type { EWalletMsgMakeSignature } from "@keplr-ewallet-sdk-core/types";

import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

export async function makeSignature(
  this: CosmosEWallet,
  signDocHash: Uint8Array,
) {
  const msg: EWalletMsgMakeSignature = {
    target: "keplr_ewallet_attached",
    msg_type: "make_signature",
    payload: { msg: signDocHash },
  };

  return await this.eWallet.makeSignature(msg);
}
