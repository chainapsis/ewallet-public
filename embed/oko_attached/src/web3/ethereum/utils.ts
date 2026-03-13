import type { AppCurrency } from "@keplr-wallet/types";
import type { ChainInfoForAttachedModal } from "@oko-wallet/oko-sdk-core";
import { parseChainId } from "@oko-wallet/oko-sdk-eth";
import { type Chain, defineChain, formatUnits } from "viem";

import {
  evmExplorers,
  OP_STACK_L1_DATA_FEE_FEATURE,
  opStackContracts,
} from "@oko-wallet-attached/web3/ethereum/constants";

export interface FormattedTokenAmount {
  display: string;
  full: string;
  isTruncated: boolean;
}

export function formatTokenAmount(
  amount: bigint,
  meta?: {
    name?: string;
    decimals?: number;
    symbol?: string;
  },
  options?: {
    maxLength?: number;
    maxDecimals?: number;
  },
): FormattedTokenAmount {
  // If the token metadata is not available, show "Unknown"
  if (meta?.decimals === undefined && meta?.symbol === undefined) {
    return {
      display: "Unknown",
      full: "Unknown",
      isTruncated: false,
    };
  }

  const maxLength = options?.maxLength ?? 20;
  const maxDecimals = options?.maxDecimals ?? 6;

  const decimals = meta?.decimals ?? 18;
  const symbol = meta?.symbol;

  // Show a readable lower bound for tiny, non-zero amounts.
  // If value < 10^-maxDecimals in display units, show "<= 0.00...1".
  if (amount > BigInt(0) && maxDecimals > 0) {
    const power = Math.max(0, decimals - Math.min(decimals, maxDecimals));
    const thresholdRaw = BigInt(10) ** BigInt(power);
    if (amount < thresholdRaw) {
      const thresholdText = `0.${"0".repeat(Math.max(0, maxDecimals - 1))}1`;
      const smallDisplay = symbol
        ? `< ${thresholdText} ${symbol}`
        : `< ${thresholdText}`;
      return {
        display: smallDisplay,
        full: smallDisplay,
        isTruncated: false,
      };
    }
  }

  let formatted = formatUnits(amount, decimals);

  const [integerPart, decimalPart] = formatted.split(".");
  if (decimalPart && decimalPart.length > maxDecimals) {
    formatted = `${integerPart}.${decimalPart.slice(0, maxDecimals)}`;
  }

  let fullText: string;

  if (symbol) {
    fullText = `${formatted} ${symbol}`;
  } else {
    fullText = formatted;
  }

  let displayText: string;

  if (fullText.length > maxLength) {
    const symbol = meta?.symbol;
    if (symbol) {
      const symbolWithSpace = ` ${symbol}`;
      const availableLength = maxLength - symbolWithSpace.length - 3;

      if (availableLength > 0) {
        const numberPart = fullText.replace(symbolWithSpace, "");
        displayText = `${numberPart.slice(0, availableLength)}...${symbolWithSpace}`;
      } else {
        displayText = symbol;
      }
    } else {
      displayText = `${fullText.slice(0, maxLength - 3)}...`;
    }
  } else {
    displayText = fullText;
  }

  const isTruncated = fullText.length > maxLength;

  return {
    display: displayText,
    full: fullText,
    isTruncated,
  };
}

export function toEthereumChain(chainInfo: ChainInfoForAttachedModal): Chain {
  const isOpStack = chainInfo.features?.includes(OP_STACK_L1_DATA_FEE_FEATURE);
  const nativeCurrency = chainInfo.currencies?.[0];

  return defineChain({
    id: parseChainId(chainInfo.chain_id),
    name: chainInfo.chain_name,
    nativeCurrency: {
      name: nativeCurrency?.coinMinimalDenom ?? "Ether",
      symbol: nativeCurrency?.coinDenom ?? "ETH",
      decimals: nativeCurrency?.coinDecimals ?? 18,
    },
    rpcUrls: {
      default: {
        http: [chainInfo.rpc_url],
      },
    },
    blockExplorers: {
      default: {
        name: "Explorer",
        url: evmExplorers[chainInfo.chain_id] ?? chainInfo.block_explorer_url,
      },
    },
    contracts: isOpStack ? opStackContracts : undefined,
  });
}

export function findCurrencyByErc20Address(
  chainInfo: ChainInfoForAttachedModal,
  tokenAddress?: string,
): AppCurrency | undefined {
  if (!tokenAddress) {
    return chainInfo.currencies?.[0];
  }

  return chainInfo.currencies?.find(
    (c) => c.coinMinimalDenom === `erc20:${tokenAddress.toLowerCase()}`,
  );
}

export function findNativeCurrencyWithFallback(
  chainInfo: ChainInfoForAttachedModal,
): AppCurrency {
  const currency = findCurrencyByErc20Address(chainInfo);
  if (currency) {
    return currency;
  }

  return {
    coinMinimalDenom: "ETH",
    coinDenom: "ETH",
    coinDecimals: 18,
  };
}
