import type { AccountData } from "@cosmjs/amino";

import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";
import {
  getBech32Address,
  getCosmosAddress,
  getEthAddress,
  isEthereumCompatible,
} from "@oko-wallet-sdk-cosmos/utils/address";
import { sendGetCosmosChainInfo } from "@oko-wallet-sdk-cosmos/utils/chain";

export async function getAccounts(
  this: OkoCosmosWalletInterface,
): Promise<AccountData[]> {
  const pubKey = await this.getPublicKey();
  if (pubKey === null) {
    return [];
  }

  const chainInfoRes = await sendGetCosmosChainInfo(this.okoWallet);
  if (!chainInfoRes.success) {
    throw new Error(chainInfoRes.err.toString());
  }

  const chainInfoList = chainInfoRes.data;

  const accounts: AccountData[] = [];
  for (const chainInfo of chainInfoList) {
    const prefix = chainInfo.bech32Config?.bech32PrefixAccAddr;
    if (!prefix) {
      continue;
    }

    const hasEthereumSupport = isEthereumCompatible(chainInfo);
    const address = hasEthereumSupport
      ? getEthAddress(pubKey)
      : getCosmosAddress(pubKey);
    const bech32Address = getBech32Address(address, prefix);

    accounts.push({
      address: bech32Address,
      algo: "secp256k1",
      pubkey: pubKey,
    });
  }

  return accounts;
}
