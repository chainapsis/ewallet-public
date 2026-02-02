/**
 * Chain utility functions
 */

import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";

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
