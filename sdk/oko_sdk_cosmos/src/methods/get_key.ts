import type { Key } from "@keplr-wallet/types";

import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";
import {
  getBech32Address,
  getCosmosAddress,
  getEthAddress,
  isEthereumCompatible,
} from "@oko-wallet-sdk-cosmos/utils/address";

export async function getKey(
  this: OkoCosmosWalletInterface,
  chainId: string,
): Promise<Key> {
  const pubKey = await this.getPublicKey();

  //NOTE: For now, to match the existing Keplr functions and types,
  //the current getKey method throws an error to prevent it from being nullable. @retto
  if (pubKey === null) {
    throw new Error(
      "Public key not found, check if the Oko wallet is initialized",
    );
  }

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
