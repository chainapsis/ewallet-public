import { Dec, Int } from "@keplr-wallet/unit";

import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";

/**
 * Convert human-readable amount to raw (minimal denom) amount.
 * e.g., "1.5" with 18 decimals → "1500000000000000000"
 */
export function humanToRawAmount(
  humanAmount: string,
  decimals: number,
): string {
  if (!humanAmount || humanAmount === "0") {
    return "0";
  }
  try {
    const amount = new Dec(humanAmount);
    const multiplier = new Dec(10).pow(new Int(decimals));
    return amount.mul(multiplier).truncate().toString();
  } catch {
    return "0";
  }
}

/**
 * Convert raw (minimal denom) amount to human-readable amount.
 * e.g., "1500000000000000000" with 18 decimals → "1.5"
 */
export function rawToHumanAmount(rawAmount: string, decimals: number): string {
  if (!rawAmount || rawAmount === "0") {
    return "0";
  }
  try {
    const amount = new Dec(rawAmount);
    const divisor = new Dec(10).pow(new Int(decimals));
    return amount.quo(divisor).toString();
  } catch {
    return "0";
  }
}

/**
 * Validate that amount is positive and does not exceed the max balance.
 */
export function isAmountValid(
  humanAmount: string,
  maxRaw: string,
  decimals: number,
): boolean {
  if (!humanAmount || humanAmount === "0") {
    return false;
  }
  try {
    const amount = new Dec(humanAmount);
    if (amount.lte(new Dec(0))) {
      return false;
    }
    const rawAmount = humanToRawAmount(humanAmount, decimals);
    return BigInt(rawAmount) <= BigInt(maxRaw);
  } catch {
    return false;
  }
}

/**
 * Build a block explorer URL for the given chain and tx hash.
 * Uses the explorer template from chain data API (explorers.txPage).
 * Template format: "https://etherscan.io/tx/0x{txHash}" with optional
 * modifiers like {txHash:uppercase} or {txHash:lowercase}.
 */
export function getExplorerTxUrl(
  chainInfo: ModularChainInfo,
  txHash: string,
): string | null {
  const template = chainInfo.explorers?.txPage;
  if (!template) {
    return null;
  }

  return template.replace(/\{txHash(?::(\w+))?\}/g, (_, modifier) => {
    if (modifier === "uppercase") {
      return txHash.toUpperCase();
    }
    if (modifier === "lowercase") {
      return txHash.toLowerCase();
    }
    return txHash;
  });
}

/**
 * Extract ERC20 contract address from coinMinimalDenom.
 * e.g., "erc20:0x1234..." → "0x1234..."
 */
export function getErc20ContractAddress(coinMinimalDenom: string): string {
  return coinMinimalDenom.slice(6);
}

/**
 * Extract SPL mint address from coinMinimalDenom.
 * e.g., "spl:TokenMintAddress..." → "TokenMintAddress..."
 */
export function getSplMintAddress(coinMinimalDenom: string): string {
  return coinMinimalDenom.slice(4);
}
