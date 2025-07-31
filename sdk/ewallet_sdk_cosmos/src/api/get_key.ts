import type { Key } from "@keplr-wallet/types";

import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";
import {
  getBech32Address,
  getCosmosAddress,
  getEthAddress,
  isEthereumCompatible,
} from "@keplr-ewallet-sdk-cosmos/utils/address";

export async function getKey(
  this: CosmosEWallet,
  chainId: string,
): Promise<Key> {
  const pubKey = await this.getPublicKey();
  const chainInfoList = await this.getCosmosChainInfo();

  const chainInfo = chainInfoList.find(
    (chainInfo) => chainInfo.chainId === chainId,
  );
  if (!chainInfo || !chainInfo.bech32Config?.bech32PrefixAccAddr) {
    throw new Error("Chain info not found");
  }

  const hasEthereumSupport = isEthereumCompatible(chainInfo);
  const address = hasEthereumSupport
    ? getEthAddress(pubKey)
    : getCosmosAddress(pubKey);

  const bech32Address = getBech32Address(
    address,
    chainInfo.bech32Config.bech32PrefixAccAddr,
  );

  return {
    bech32Address,
    address,
    pubKey,
    algo: hasEthereumSupport ? "ethsecp256k1" : "secp256k1",
    ethereumHexAddress: hasEthereumSupport
      ? Buffer.from(getEthAddress(pubKey)).toString("hex")
      : "",
    name: "",
    isNanoLedger: false,
    isKeystone: false,
  };
}
