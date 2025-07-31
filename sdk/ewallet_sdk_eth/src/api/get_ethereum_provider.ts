import { toHex } from "viem";
import { v4 as uuidv4 } from "uuid";

import {
  initEWalletEIP1193Provider,
  type EWalletEIP1193Provider,
} from "@keplr-ewallet-sdk-eth/provider";
import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";
import {
  DEFAULT_CHAIN_ID,
  SUPPORTED_CHAINS,
} from "@keplr-ewallet-sdk-eth/chains";

export async function getEthereumProvider(
  this: EthEWallet,
): Promise<EWalletEIP1193Provider> {
  if (this.provider !== null) {
    return this.provider;
  }

  const address = await this.getAddress();

  const activeChain =
    SUPPORTED_CHAINS.find((chain) => chain.id === DEFAULT_CHAIN_ID) ??
    SUPPORTED_CHAINS[0];

  const addEthereumChainParameters = [
    activeChain,
    ...SUPPORTED_CHAINS.filter((chain) => chain.id !== DEFAULT_CHAIN_ID),
  ].map((chain) => ({
    chainId: toHex(chain.id),
    chainName: chain.name,
    rpcUrls: chain.rpcUrls.default.http,
    nativeCurrency: chain.nativeCurrency,
    blockExplorerUrls: chain.blockExplorers?.default.url
      ? [chain.blockExplorers.default.url]
      : [],
  }));

  this.provider = await initEWalletEIP1193Provider({
    id: uuidv4(),
    signer: {
      sign: this.makeSignature,
      address,
    },
    chains: addEthereumChainParameters,
    skipChainValidation: true, // skip chain validation as the chains are already validated
  });

  return this.provider;
}
