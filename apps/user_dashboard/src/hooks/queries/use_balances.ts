import { useOko } from "@oko-wallet/oko-sdk-react";
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
import {
  fetchCw20TokenBalances,
  fetchCw20TokenRegistry,
} from "@oko-wallet-user-dashboard/fetch/cw20_token_balances";
import { fetchErc20TokenBalances } from "@oko-wallet-user-dashboard/fetch/erc20_token_balances";
import { fetchFactoryTokenMeta } from "@oko-wallet-user-dashboard/fetch/factory_token_meta";
import { fetchOsmosisAssetList } from "@oko-wallet-user-dashboard/fetch/osmosis_asset_list";
import { fetchSplTokenBalances } from "@oko-wallet-user-dashboard/fetch/spl_token_balances";
import { DEFAULT_ENABLED_CHAINS } from "@oko-wallet-user-dashboard/state/chains";
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
import { normalizeIBCDenom } from "@oko-wallet-user-dashboard/utils/normalize_denom";

const CHAIN_ORDER = new Map<string, number>(
  DEFAULT_ENABLED_CHAINS.map((id, index) => [id, index]),
);

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
  resolveTokenMetadata: (
    tokens: { chainIdentifier: string; contractAddress: string }[],
  ) => Promise<Map<string, Currency>>,
): Promise<TokenBalance[]> {
  const cosmos = chain.cosmos;
  if (!cosmos?.rest) {
    return [];
  }

  const rawBalances = await fetchCosmosRawBalances(cosmos.rest, cosmosAddress);
  const results: TokenBalance[] = [];

  const mainCurrency = cosmos.stakeCurrency ?? cosmos.currencies[0];
  let mainCurrencyAdded = false;

  const knownCurrencyMap = new Map<string, Currency>();
  for (const c of cosmos.currencies) {
    knownCurrencyMap.set(c.coinMinimalDenom, c);
  }

  const unknownBalances: RawBalance[] = [];

  for (const bal of rawBalances) {
    if (BigInt(bal.amount) <= BigInt(0)) {
      continue;
    }

    const currency = knownCurrencyMap.get(bal.denom);
    if (currency) {
      results.push(
        buildTokenBalance(chain, currency, bal.amount, cosmosAddress, priceMap),
      );
      if (
        mainCurrency &&
        currency.coinMinimalDenom === mainCurrency.coinMinimalDenom
      ) {
        mainCurrencyAdded = true;
      }
    } else {
      unknownBalances.push(bal);
    }
  }

  if (unknownBalances.length > 0) {
    // Separate factory tokens from other unknowns (IBC, native, etc.)
    const factoryBalances: RawBalance[] = [];
    const otherUnknowns: RawBalance[] = [];
    for (const bal of unknownBalances) {
      if (bal.denom.startsWith("factory/")) {
        factoryBalances.push(bal);
      } else {
        otherUnknowns.push(bal);
      }
    }

    // Resolve factory tokens via Chainapsis API
    let factoryMap = new Map<string, Currency>();
    if (factoryBalances.length > 0) {
      try {
        factoryMap = await fetchFactoryTokenMeta(
          chain.chainId,
          factoryBalances.map((b) => b.denom),
        );
      } catch (error) {
        console.error(
          `Failed to fetch factory token meta for ${chain.chainId}:`,
          error,
        );
      }
    }

    // Resolve other unknown tokens via Keplr asset_meta API
    const chainIdentifier = getChainIdentifier(chain.chainId);
    let assetMetaMap = new Map<string, Currency>();
    if (otherUnknowns.length > 0) {
      const tokensToResolve = otherUnknowns.map((bal) => ({
        chainIdentifier,
        contractAddress: normalizeIBCDenom(bal.denom),
      }));
      assetMetaMap = await resolveTokenMetadata(tokensToResolve);

      // Enrich with Osmosis asset list for accurate display names
      // (e.g. asset_meta returns "USDC" for both Noble and Axelar USDC)
      if (chainIdentifier === "osmosis") {
        try {
          const osmosisAssets = await fetchOsmosisAssetList();
          for (const bal of otherUnknowns) {
            const normalizedDenom = normalizeIBCDenom(bal.denom);
            const currency = assetMetaMap.get(normalizedDenom);
            const osmosisAsset = osmosisAssets.byDenom.get(bal.denom);
            if (
              currency &&
              osmosisAsset &&
              osmosisAsset.symbol !== currency.coinDenom
            ) {
              assetMetaMap.set(normalizedDenom, {
                ...currency,
                coinDenom: osmosisAsset.symbol,
                coinImageUrl:
                  currency.coinImageUrl ??
                  osmosisAsset.logoURIs?.svg ??
                  osmosisAsset.logoURIs?.png,
              });
            }
          }
        } catch (error) {
          console.error("Failed to fetch Osmosis asset list:", error);
        }
      }
    }

    // Collect missing prices from both sources
    const missingPriceIds: string[] = [];
    for (const bal of factoryBalances) {
      const currency = factoryMap.get(bal.denom);
      if (
        currency?.coinGeckoId &&
        priceMap[currency.coinGeckoId] === undefined
      ) {
        missingPriceIds.push(currency.coinGeckoId);
      }
    }
    for (const bal of otherUnknowns) {
      const currency = assetMetaMap.get(normalizeIBCDenom(bal.denom));
      if (
        currency?.coinGeckoId &&
        priceMap[currency.coinGeckoId] === undefined
      ) {
        missingPriceIds.push(currency.coinGeckoId);
      }
    }

    const extraPriceMap: Record<string, number> = {};
    if (missingPriceIds.length > 0) {
      try {
        const priceResponse = await fetchPrices(missingPriceIds);
        for (const [coinId, data] of Object.entries(priceResponse)) {
          extraPriceMap[coinId] = data.usd;
        }
      } catch (error) {
        console.error(
          `Failed to fetch prices for unknown tokens on ${chain.chainId}:`,
          error,
        );
      }
    }

    const mergedPriceMap: PriceMap = { ...priceMap, ...extraPriceMap };

    for (const bal of factoryBalances) {
      const currency = factoryMap.get(bal.denom);
      if (currency) {
        results.push(
          buildTokenBalance(
            chain,
            currency,
            bal.amount,
            cosmosAddress,
            mergedPriceMap,
          ),
        );
      }
    }
    for (const bal of otherUnknowns) {
      const currency = assetMetaMap.get(normalizeIBCDenom(bal.denom));
      if (currency) {
        results.push(
          buildTokenBalance(
            chain,
            currency,
            bal.amount,
            cosmosAddress,
            mergedPriceMap,
          ),
        );
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

async function getCw20Balances(
  chain: ModularChainInfo,
  cosmosAddress: string,
  priceMap: PriceMap,
): Promise<TokenBalance[]> {
  const cosmos = chain.cosmos;
  if (!cosmos?.rest || !cosmos.features?.includes("cosmwasm")) {
    return [];
  }

  const registry = await fetchCw20TokenRegistry();
  const chainIdentifier = getChainIdentifier(chain.chainId);
  const tokenContracts = registry[chainIdentifier];
  if (!tokenContracts || tokenContracts.length === 0) {
    return [];
  }

  const cw20Balances = await fetchCw20TokenBalances(
    cosmos.rest,
    cosmosAddress,
    tokenContracts,
  );
  if (cw20Balances.length === 0) {
    return [];
  }

  const missingPriceIds: string[] = [];
  for (const tb of cw20Balances) {
    if (
      tb.currency.coinGeckoId &&
      priceMap[tb.currency.coinGeckoId] === undefined
    ) {
      missingPriceIds.push(tb.currency.coinGeckoId);
    }
  }

  const cw20PriceMap: Record<string, number> = {};
  if (missingPriceIds.length > 0) {
    try {
      const priceResponse = await fetchPrices(missingPriceIds);
      for (const [coinId, data] of Object.entries(priceResponse)) {
        cw20PriceMap[coinId] = data.usd;
      }
    } catch (error) {
      console.error(`Failed to fetch CW20 prices for ${chain.chainId}:`, error);
    }
  }

  const mergedPriceMap: PriceMap = { ...priceMap, ...cw20PriceMap };
  const results: TokenBalance[] = [];

  for (const tb of cw20Balances) {
    results.push(
      buildTokenBalance(
        chain,
        tb.currency,
        tb.balance,
        cosmosAddress,
        mergedPriceMap,
      ),
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

function getSvmChainIdentifier(chainId: string): string {
  const colonIndex = chainId.indexOf(":");
  return colonIndex !== -1 ? chainId.slice(0, colonIndex) : chainId;
}

async function getSvmSplBalances(
  chain: ModularChainInfo,
  svmAddress: string,
  priceMap: PriceMap,
  resolveTokenMetadata: (
    tokens: { chainIdentifier: string; contractAddress: string }[],
  ) => Promise<Map<string, Currency>>,
): Promise<TokenBalance[]> {
  const svm = chain.svm;
  if (!svm?.rpc) {
    return [];
  }

  const splBalances = await fetchSplTokenBalances(svm.rpc, svmAddress);
  if (splBalances.length === 0) {
    return [];
  }

  const knownCurrencyMap = new Map<string, Currency>();
  for (const c of svm.currencies) {
    if (c.coinMinimalDenom.startsWith("spl:")) {
      knownCurrencyMap.set(c.coinMinimalDenom.slice(4).toLowerCase(), c);
    }
  }

  const unknownTokens: {
    chainIdentifier: string;
    contractAddress: string;
  }[] = [];
  const decimalsMap = new Map<string, number>();

  for (const tb of splBalances) {
    const mintLower = tb.mint.toLowerCase();
    if (!knownCurrencyMap.has(mintLower)) {
      unknownTokens.push({
        chainIdentifier: getSvmChainIdentifier(chain.chainId),
        contractAddress: tb.mint,
      });
    }
    decimalsMap.set(mintLower, tb.decimals);
  }

  const resolvedMap =
    unknownTokens.length > 0
      ? await resolveTokenMetadata(unknownTokens)
      : new Map<string, Currency>();

  const missingPriceIds: string[] = [];
  for (const tb of splBalances) {
    const mintLower = tb.mint.toLowerCase();
    const currency =
      knownCurrencyMap.get(mintLower) ?? resolvedMap.get(mintLower);
    if (currency?.coinGeckoId && priceMap[currency.coinGeckoId] === undefined) {
      missingPriceIds.push(currency.coinGeckoId);
    }
  }

  const splPriceMap: Record<string, number> = {};
  if (missingPriceIds.length > 0) {
    try {
      const priceResponse = await fetchPrices(missingPriceIds);
      for (const [coinId, data] of Object.entries(priceResponse)) {
        splPriceMap[coinId] = data.usd;
      }
    } catch (error) {
      console.error(
        `Failed to fetch SPL token prices for ${chain.chainId}:`,
        error,
      );
    }
  }

  const mergedPriceMap: PriceMap = { ...priceMap, ...splPriceMap };
  const results: TokenBalance[] = [];

  for (const tb of splBalances) {
    const mintLower = tb.mint.toLowerCase();
    let currency =
      knownCurrencyMap.get(mintLower) ?? resolvedMap.get(mintLower);

    if (!currency) {
      const shortMint = `${tb.mint.slice(0, 6)}...${tb.mint.slice(-4)}`;
      currency = {
        coinDenom: shortMint,
        coinMinimalDenom: `spl:${tb.mint}`,
        coinDecimals: tb.decimals,
      };
    }

    results.push(
      buildTokenBalance(chain, currency, tb.amount, svmAddress, mergedPriceMap),
    );
  }

  return results;
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
      getCosmosBalances(
        chain,
        addresses.cosmos,
        priceMap,
        resolveTokenMetadata,
      ).catch((error) => {
        console.error(
          `Failed to fetch Cosmos balances for ${chain.chainId}:`,
          error,
        );
        return [];
      }),
    );
    tasks.push(
      getCw20Balances(chain, addresses.cosmos, priceMap).catch((error) => {
        console.error(
          `Failed to fetch CW20 balances for ${chain.chainId}:`,
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
    tasks.push(
      getSvmSplBalances(
        chain,
        addresses.svm,
        priceMap,
        resolveTokenMetadata,
      ).catch((error) => {
        console.error(
          `Failed to fetch SPL token balances for ${chain.chainId}:`,
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
  const { publicKey } = useOko();

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
          publicKey,
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
        gcTime: Infinity,
      };
    }),
  });

  const allBalances = balanceQueries
    .flatMap((query) =>
      (query.data ?? []).map((b) => ({
        ...b,
        error: query.error instanceof Error ? query.error : undefined,
      })),
    )
    .map((balance) => ({
      ...balance,
      priceUsd: balance.token.currency.coinGeckoId
        ? priceMap[balance.token.currency.coinGeckoId]
        : undefined,
    }))
    .sort((a, b) => {
      // Primary: USD value descending
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
      if (bValue !== aValue) {
        return bValue - aValue;
      }

      // Secondary: tokens with balance above zero rank higher
      const aHasBalance = Number(a.token.amount) > 0 ? 1 : 0;
      const bHasBalance = Number(b.token.amount) > 0 ? 1 : 0;
      if (bHasBalance !== aHasBalance) {
        return bHasBalance - aHasBalance;
      }

      // Tertiary: chain order (ETH → SOL → ATOM → OSMO → rest)
      const aChainOrder =
        CHAIN_ORDER.get(getChainIdentifier(a.chainInfo.chainId)) ??
        CHAIN_ORDER.size;
      const bChainOrder =
        CHAIN_ORDER.get(getChainIdentifier(b.chainInfo.chainId)) ??
        CHAIN_ORDER.size;
      return aChainOrder - bChainOrder;
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
