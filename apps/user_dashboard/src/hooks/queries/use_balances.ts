import { Connection, PublicKey } from "@solana/web3.js";
import { useQueries } from "@tanstack/react-query";

import {
  useCosmosAddresses,
  useEthAddress,
  useSVMAddress,
} from "./use_addresses";
import { useEnabledChains } from "./use_chains";
import { fetchPrices, usePrices } from "./use_prices";
import {
  getAlchemyEndpoint,
  isAlchemySupported,
} from "@oko-wallet-user-dashboard/constants/alchemy";
import { fetchErc20TokenBalances } from "@oko-wallet-user-dashboard/fetch/erc20_token_balances";
import { useAssetMetaStore } from "@oko-wallet-user-dashboard/store/asset_meta";
import type {
  Currency,
  ModularChainInfo,
} from "@oko-wallet-user-dashboard/types/chain";
import type {
  RawBalance,
  TokenBalance,
} from "@oko-wallet-user-dashboard/types/token";
import { getChainIdentifier } from "@oko-wallet-user-dashboard/utils/chain";
import { calculateUsdValue } from "@oko-wallet-user-dashboard/utils/format_token_amount";

type PriceMap = Record<string, number | undefined>;

function buildTokenBalance(
  chain: ModularChainInfo,
  currency: Currency,
  amount: string,
  address: string,
  priceMap: PriceMap,
): TokenBalance {
  return {
    chainInfo: chain,
    token: { currency, amount },
    address,
    priceUsd: currency.coinGeckoId ? priceMap[currency.coinGeckoId] : undefined,
    isFetching: false,
    error: undefined,
  };
}

async function fetchCosmosRawBalances(
  restEndpoint: string,
  cosmosAddress: string,
): Promise<RawBalance[]> {
  const response = await fetch(
    `${restEndpoint}/cosmos/bank/v1beta1/balances/${cosmosAddress}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.balances ?? []) as RawBalance[];
}

async function fetchEvmNativeBalance(
  rpcEndpoint: string,
  address: string,
): Promise<string> {
  const response = await fetch(rpcEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch EVM balance: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }

  return BigInt(data.result).toString();
}

async function fetchSvmNativeBalance(
  rpcEndpoint: string,
  address: string,
): Promise<string> {
  const connection = new Connection(rpcEndpoint);
  const pubkey = new PublicKey(address);
  const balance = await connection.getBalance(pubkey);
  return balance.toString();
}

async function getCosmosBalances(
  chain: ModularChainInfo,
  cosmosAddress: string,
  priceMap: PriceMap,
): Promise<TokenBalance[]> {
  const cosmos = chain.cosmos;
  if (!cosmos?.rest) {
    return [];
  }

  const rawBalances = await fetchCosmosRawBalances(cosmos.rest, cosmosAddress);
  const results: TokenBalance[] = [];

  const mainCurrency = cosmos.stakeCurrency ?? cosmos.currencies[0];
  let mainCurrencyAdded = false;

  for (const bal of rawBalances) {
    const currency = cosmos.currencies.find(
      (c) => c.coinMinimalDenom === bal.denom,
    );
    if (currency && BigInt(bal.amount) > BigInt(0)) {
      results.push(
        buildTokenBalance(chain, currency, bal.amount, cosmosAddress, priceMap),
      );
      if (
        mainCurrency &&
        currency.coinMinimalDenom === mainCurrency.coinMinimalDenom
      ) {
        mainCurrencyAdded = true;
      }
    }
  }

  if (mainCurrency && !mainCurrencyAdded) {
    results.push(
      buildTokenBalance(chain, mainCurrency, "0", cosmosAddress, priceMap),
    );
  }

  return results;
}

async function getEvmNativeBalances(
  chain: ModularChainInfo,
  ethAddress: string,
  priceMap: PriceMap,
): Promise<TokenBalance[]> {
  const evm = chain.evm;
  if (!evm?.rpc) {
    return [];
  }

  const balance = await fetchEvmNativeBalance(evm.rpc, ethAddress);
  const nativeCurrency = evm.currencies[0];
  if (!nativeCurrency) {
    return [];
  }

  return [
    buildTokenBalance(chain, nativeCurrency, balance, ethAddress, priceMap),
  ];
}

async function getEvmErc20Balances(
  chain: ModularChainInfo,
  ethAddress: string,
  priceMap: PriceMap,
  resolveTokenMetadata: (
    tokens: { chainIdentifier: string; contractAddress: string }[],
  ) => Promise<Map<string, Currency>>,
): Promise<TokenBalance[]> {
  const evm = chain.evm;
  if (!evm?.chainId || !isAlchemySupported(evm.chainId)) {
    return [];
  }

  const alchemyEndpoint = getAlchemyEndpoint(evm.chainId);
  const erc20Balances = await fetchErc20TokenBalances(
    alchemyEndpoint,
    ethAddress,
  );
  if (erc20Balances.length === 0) {
    return [];
  }

  const knownCurrencyMap = new Map<string, Currency>();
  for (const c of evm.currencies) {
    if (c.coinMinimalDenom.startsWith("erc20:")) {
      const addr = c.coinMinimalDenom.slice(6).toLowerCase();
      knownCurrencyMap.set(addr, c);
    }
  }

  const unknownTokens: {
    chainIdentifier: string;
    contractAddress: string;
  }[] = [];
  for (const tb of erc20Balances) {
    if (!knownCurrencyMap.has(tb.contractAddress)) {
      unknownTokens.push({
        chainIdentifier: getChainIdentifier(chain.chainId),
        contractAddress: tb.contractAddress,
      });
    }
  }

  const resolvedMap =
    unknownTokens.length > 0
      ? await resolveTokenMetadata(unknownTokens)
      : new Map<string, Currency>();

  const missingPriceIds: string[] = [];
  for (const tb of erc20Balances) {
    const currency =
      knownCurrencyMap.get(tb.contractAddress) ??
      resolvedMap.get(tb.contractAddress);
    if (currency?.coinGeckoId && priceMap[currency.coinGeckoId] === undefined) {
      missingPriceIds.push(currency.coinGeckoId);
    }
  }

  const erc20PriceMap: Record<string, number> = {};
  if (missingPriceIds.length > 0) {
    try {
      const priceResponse = await fetchPrices(missingPriceIds);
      for (const [coinId, data] of Object.entries(priceResponse)) {
        erc20PriceMap[coinId] = data.usd;
      }
    } catch (error) {
      console.error(
        `Failed to fetch ERC20 prices for ${chain.chainId}:`,
        error,
      );
    }
  }

  const mergedPriceMap: PriceMap = { ...priceMap, ...erc20PriceMap };
  const results: TokenBalance[] = [];

  for (const tb of erc20Balances) {
    const currency =
      knownCurrencyMap.get(tb.contractAddress) ??
      resolvedMap.get(tb.contractAddress);
    if (currency) {
      results.push(
        buildTokenBalance(
          chain,
          currency,
          tb.tokenBalance,
          ethAddress,
          mergedPriceMap,
        ),
      );
    }
  }

  return results;
}

async function getSvmBalances(
  chain: ModularChainInfo,
  svmAddress: string,
  priceMap: PriceMap,
): Promise<TokenBalance[]> {
  const svm = chain.svm;
  if (!svm?.rpc) {
    return [];
  }

  const balance = await fetchSvmNativeBalance(svm.rpc, svmAddress);
  const nativeCurrency = svm.currencies[0];
  if (!nativeCurrency) {
    return [];
  }

  return [
    buildTokenBalance(chain, nativeCurrency, balance, svmAddress, priceMap),
  ];
}

async function fetchChainBalances(
  chain: ModularChainInfo,
  addresses: {
    eth?: string;
    svm?: string;
    cosmos?: string;
  },
  priceMap: PriceMap,
  resolveTokenMetadata: (
    tokens: { chainIdentifier: string; contractAddress: string }[],
  ) => Promise<Map<string, Currency>>,
): Promise<TokenBalance[]> {
  const tasks: Promise<TokenBalance[]>[] = [];

  if (chain.cosmos && addresses.cosmos) {
    tasks.push(
      getCosmosBalances(chain, addresses.cosmos, priceMap).catch((error) => {
        console.error(
          `Failed to fetch Cosmos balances for ${chain.chainId}:`,
          error,
        );
        return [];
      }),
    );
  }

  if (chain.evm && addresses.eth) {
    tasks.push(
      getEvmNativeBalances(chain, addresses.eth, priceMap).catch((error) => {
        console.error(
          `Failed to fetch EVM balance for ${chain.chainId}:`,
          error,
        );
        return [];
      }),
    );
    tasks.push(
      getEvmErc20Balances(
        chain,
        addresses.eth,
        priceMap,
        resolveTokenMetadata,
      ).catch((error) => {
        console.error(
          `Failed to fetch ERC20 balances for ${chain.chainId}:`,
          error,
        );
        return [];
      }),
    );
  }

  if (chain.svm && addresses.svm) {
    tasks.push(
      getSvmBalances(chain, addresses.svm, priceMap).catch((error) => {
        console.error(
          `Failed to fetch SVM balance for ${chain.chainId}:`,
          error,
        );
        return [];
      }),
    );
  }

  const results = await Promise.all(tasks);
  return results.flat();
}

export function useAllBalances() {
  const { chains: enabledChains, isLoading: chainsLoading } =
    useEnabledChains();
  const { priceMap, isLoading: pricesLoading } = usePrices();
  const resolveTokenMetadata = useAssetMetaStore(
    (state) => state.resolveTokenMetadata,
  );

  const { address: ethAddress, isLoading: ethLoading } = useEthAddress();
  const { address: svmAddress, isLoading: svmLoading } = useSVMAddress();
  const { addresses: cosmosAddresses, isLoading: addressesLoading } =
    useCosmosAddresses();

  const balanceQueries = useQueries({
    queries: enabledChains.map((chain) => {
      const isCosmos = chain.cosmos !== undefined;
      const isEvm = chain.evm !== undefined;
      const isSVM = chain.svm !== undefined;
      const cosmosAddress = isCosmos
        ? cosmosAddresses[chain.chainId]
        : undefined;

      return {
        queryKey: [
          "balances",
          chain.chainId,
          cosmosAddress,
          ethAddress,
          svmAddress,
        ],
        queryFn: () =>
          fetchChainBalances(
            chain,
            {
              eth: ethAddress ?? undefined,
              svm: svmAddress ?? undefined,
              cosmos: cosmosAddress,
            },
            priceMap,
            resolveTokenMetadata,
          ),
        enabled:
          (isCosmos && !!cosmosAddress) ||
          (isEvm && !!ethAddress) ||
          (isSVM && !!svmAddress),
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
      };
    }),
  });

  const allBalances = balanceQueries
    .flatMap((query) => query.data ?? [])
    .sort((a, b) => {
      const aValue =
        a.priceUsd && a.token.currency.coinDecimals
          ? calculateUsdValue(
              a.token.amount,
              a.token.currency.coinDecimals,
              a.priceUsd,
            )
          : 0;
      const bValue =
        b.priceUsd && b.token.currency.coinDecimals
          ? calculateUsdValue(
              b.token.amount,
              b.token.currency.coinDecimals,
              b.priceUsd,
            )
          : 0;
      return bValue - aValue;
    });

  const balancesByChainIdentifier = new Map();
  for (const balance of allBalances) {
    const identifier = getChainIdentifier(balance.chainInfo.chainId);
    const existing = balancesByChainIdentifier.get(identifier) ?? [];
    existing.push(balance);
    balancesByChainIdentifier.set(identifier, existing);
  }

  const isLoading =
    chainsLoading ||
    ethLoading ||
    svmLoading ||
    addressesLoading ||
    balanceQueries.some((q) => q.isLoading) ||
    pricesLoading;
  const isFetching = balanceQueries.some((q) => q.isFetching);
  const hasError = balanceQueries.some((q) => q.error);

  return {
    balances: allBalances,
    balancesByChainIdentifier,
    isLoading,
    isFetching,
    hasError,
  };
}

export function useTotalBalance() {
  const { balances, isLoading } = useAllBalances();

  let totalUsd = 0;
  for (const bal of balances) {
    if (!bal.priceUsd) {
      continue;
    }

    totalUsd += calculateUsdValue(
      bal.token.amount,
      bal.token.currency.coinDecimals,
      bal.priceUsd,
    );
  }

  return {
    totalUsd,
    isLoading,
  };
}
