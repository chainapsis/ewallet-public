import type { KeplrSignOptions } from "@keplr-wallet/types";
import type { OfflineDirectSigner } from "@cosmjs/proto-signing";

import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

export function getOfflineSigner(
  this: CosmosEWallet,
  chainId: string,

  signOptions?: KeplrSignOptions,
): OfflineDirectSigner {
  return {
    getAccounts: this.getAccounts,
    signDirect: (signerAddress, signDoc) =>
      this.signDirect(chainId, signerAddress, signDoc, signOptions),
  };
}
