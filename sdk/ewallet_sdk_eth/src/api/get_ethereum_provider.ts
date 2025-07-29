import { toHex } from "viem";
import { v4 as uuidv4 } from "uuid";

import {
  initEWalletEIP1193Provider,
  type EIP1193Provider,
} from "@keplr-ewallet-sdk-eth/provider";
import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export async function getEthereumProvider(
  this: EthEWallet,
): Promise<EIP1193Provider> {
  if (this.provider !== null) {
    return this.provider;
  }

  const address = await this.getAddress();

  const activeChain =
    this.chains.find(
      (chain) => chain.id === this.activeChainId || chain.id === 1,
    ) ?? this.chains[0];

  const addEthereumChainParameters = [
    activeChain,
    ...this.chains.filter((chain) => chain.id !== this.activeChainId),
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
