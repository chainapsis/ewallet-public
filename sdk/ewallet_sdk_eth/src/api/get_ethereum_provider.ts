import { isAddress, toHex } from "viem";
import { v4 as uuidv4 } from "uuid";

import {
  initEWalletEIP1193Provider,
  type EIP1193Provider,
} from "@keplr-ewallet-sdk-eth/provider";
import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export async function getEthereumProvider(
  this: EthEWallet,
): Promise<EIP1193Provider> {
  if (this.cachedProvider !== null) {
    return this.cachedProvider;
  }

  // initial chain should be added first, as first chain is active by default on init provider
  const activeChain =
    this.chains.find((chain) => chain.id === this.activeChainId) ??
    this.chains[0];

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

  const providerId = uuidv4();
  const hasSigner = isAddress(this.address);

  if (hasSigner) {
    const sign = this.makeSignature;
    this.cachedProvider = await initEWalletEIP1193Provider({
      id: providerId,
      signer: {
        sign,
        address: this.address,
      },
      chains: addEthereumChainParameters,
    });
  } else {
    // if signer is not available, only handle public rpc requests
    // don't cache public rpc provider
    return await initEWalletEIP1193Provider({
      id: providerId,
      chains: addEthereumChainParameters,
    });
  }

  return this.cachedProvider;
}
