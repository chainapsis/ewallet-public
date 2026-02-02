/**
 * Chain utility functions
 */

import { ChainIdHelper } from "@keplr-wallet/cosmos";

import type {
  CosmosChainInfo,
  ModularChainInfo,
} from "@oko-wallet-user-dashboard/types/chain";

// Cache for ChainIdHelper.parse() results
const chainIdentifierCache = new Map<string, string>();

/**
 * Get chain identifier with caching to avoid repeated parsing
 */
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

/**
 * Check if chainInfo is an EVM-only chain (e.g., Ethereum mainnet)
 * EVM-only chains use the "eip155:" prefix convention
 */
export function isEvmOnlyChain(chainInfo: ModularChainInfo): boolean {
  return chainInfo.chainId.startsWith("eip155:");
}

/**
 * Check if chainInfo has EVM support (including Cosmos chains with EVM module)
 */
export function hasEvmSupport(chainInfo: ModularChainInfo): boolean {
  return chainInfo.evm !== undefined;
}

/**
 * Check if chainInfo has Cosmos support
 */
export function hasCosmosSupport(chainInfo: ModularChainInfo): boolean {
  return chainInfo.cosmos !== undefined;
}

/**
 * Check if chainId is for a Cosmos chain (not EVM-only, Bitcoin, Starknet, or Solana)
 * Used for address derivation logic
 */
export function isCosmosChainId(chainId: string): boolean {
  return (
    !chainId.startsWith("eip155:") &&
    !chainId.startsWith("bip122:") &&
    !chainId.startsWith("starknet:") &&
    !chainId.startsWith("solana:")
  );
}

export function isSVMChainId(chainId: string): boolean {
  return chainId.startsWith("solana:");
}

export function hasSVMSupport(chainInfo: ModularChainInfo): boolean {
  return chainInfo.svm !== undefined;
}
