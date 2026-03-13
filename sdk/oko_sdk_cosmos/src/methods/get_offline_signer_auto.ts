import type { OfflineAminoSigner } from "@cosmjs/amino";
import type { OfflineDirectSigner } from "@cosmjs/proto-signing";
import type { KeplrSignOptions } from "@keplr-wallet/types";

import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";

export async function getOfflineSignerAuto(
  this: OkoCosmosWalletInterface,
  chainId: string,
  signOptions?: KeplrSignOptions,
): Promise<OfflineDirectSigner | OfflineAminoSigner> {
  const key = await this.getKey(chainId);

  if (key?.isNanoLedger) {
    return this.getOfflineSignerOnlyAmino(chainId, signOptions);
  }
  return this.getOfflineSigner(chainId, signOptions);
}
