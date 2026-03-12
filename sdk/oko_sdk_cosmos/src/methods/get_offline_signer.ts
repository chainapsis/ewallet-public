import type { OfflineDirectSigner } from "@cosmjs/proto-signing";
import type { KeplrSignOptions } from "@keplr-wallet/types";

import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";

export function getOfflineSigner(
  this: OkoCosmosWalletInterface,
  chainId: string,
  signOptions?: KeplrSignOptions,
): OfflineDirectSigner {
  return {
    getAccounts: this.getAccounts.bind(this),
    signDirect: (signerAddress, signDoc) =>
      this.signDirect(chainId, signerAddress, signDoc, signOptions),
  };
}
