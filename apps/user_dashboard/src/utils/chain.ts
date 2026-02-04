import { ChainIdHelper } from "@keplr-wallet/cosmos";

import type {
  CosmosChainInfo,
  ModularChainInfo,
} from "@oko-wallet-user-dashboard/types/chain";

export const ETHEREUM_MAINNET_CHAIN_ID = "eip155:1";
export const SOLANA_MAINNET_CHAIN_ID =
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

const chainIdentifierCache = new Map<string, string>();

export function getChainIdentifier(chainId: string): string {
  let identifier = chainIdentifierCache.get(chainId);
  if (!identifier) {
    identifier = ChainIdHelper.parse(chainId).identifier;
    chainIdentifierCache.set(chainId, identifier);
  }
  return identifier;
}

export function transformKeplrChain(chain: CosmosChainInfo): ModularChainInfo {
  const isSVM = !!chain.svm;
  const isCosmos = !!chain.bech32Config;
  const isEVM = !!chain.evm;

  const base = {
    chainId: chain.chainId,
    chainName: chain.chainName,
    chainSymbolImageUrl: chain.chainSymbolImageUrl,
    isTestnet: chain.isTestnet,
  };

  if (isSVM) {
    return {
      ...base,
      svm: {
        rpc: chain.svm!.rpc,
        currencies: chain.currencies,
      },
    };
  }

  if (isCosmos) {
    return {
      ...base,
      isNative: true,
      cosmos: chain,
      evm: isEVM
        ? {
            chainId: chain.evm!.chainId,
            rpc: chain.evm!.rpc,
            currencies: chain.currencies,
            feeCurrencies: chain.feeCurrencies,
            bip44: chain.bip44,
            features: chain.features,
          }
        : undefined,
    };
  }

  if (isEVM) {
    return {
      ...base,
      evm: {
        chainId: chain.evm!.chainId,
        rpc: chain.evm!.rpc,
        currencies: chain.currencies,
        feeCurrencies: chain.feeCurrencies,
        bip44: chain.bip44,
        features: chain.features,
      },
    };
  }

  return base;
}

export function isEvmOnlyChain(chainInfo: ModularChainInfo): boolean {
  return !!chainInfo.evm && !chainInfo.cosmos;
}

export function hasCosmosSupport(chainInfo: ModularChainInfo): boolean {
  return chainInfo.cosmos !== undefined;
}

export function hasEvmSupport(chainInfo: ModularChainInfo): boolean {
  return chainInfo.evm !== undefined;
}

export function hasSVMSupport(chainInfo: ModularChainInfo): boolean {
  return chainInfo.svm !== undefined;
}
