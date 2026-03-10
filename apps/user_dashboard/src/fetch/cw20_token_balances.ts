import type { Currency } from "@oko-wallet-user-dashboard/types/chain";

export interface Cw20TokenBalance {
  contractAddress: string;
  balance: string;
  currency: Currency;
}

interface Cw20BalanceResponse {
  data: {
    balance: string;
  };
}

export interface TokenContractInfo {
  contractAddress: string;
  imageUrl: string;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const KEPLR_CONTRACT_REGISTRY =
  "https://opbaqquqruxn7fdsgcncrtfrwa0qxnoj.lambda-url.us-west-2.on.aws";

let cachedRegistry: Record<string, TokenContractInfo[]> | null = null;
let registryFetchPromise: Promise<Record<string, TokenContractInfo[]>> | null =
  null;

export async function fetchCw20TokenRegistry(): Promise<
  Record<string, TokenContractInfo[]>
> {
  if (cachedRegistry) {
    return cachedRegistry;
  }
  if (registryFetchPromise) {
    return registryFetchPromise;
  }

  registryFetchPromise = (async () => {
    const response = await fetch(`${KEPLR_CONTRACT_REGISTRY}/tokens`);
    if (!response.ok) {
      throw new Error(
        `CW20 token registry fetch failed: ${response.statusText}`,
      );
    }
    const data: Record<string, TokenContractInfo[]> = await response.json();
    cachedRegistry = data;
    registryFetchPromise = null;
    return data;
  })();

  return registryFetchPromise;
}

async function queryCw20Balance(
  restEndpoint: string,
  contractAddress: string,
  walletAddress: string,
): Promise<string> {
  const query = JSON.stringify({ balance: { address: walletAddress } });
  const queryBase64 = btoa(query);
  const url = `${restEndpoint}/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${queryBase64}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `CW20 balance query failed for ${contractAddress}: ${response.statusText}`,
    );
  }

  const result: Cw20BalanceResponse = await response.json();
  return result.data.balance;
}

function contractInfoToCurrency(info: TokenContractInfo): Currency {
  return {
    coinDenom: info.metadata.symbol,
    coinMinimalDenom: `cw20:${info.contractAddress}:${info.metadata.symbol}`,
    coinDecimals: info.metadata.decimals,
    coinImageUrl: info.imageUrl || undefined,
  };
}

export async function fetchCw20TokenBalances(
  restEndpoint: string,
  walletAddress: string,
  tokenContracts: TokenContractInfo[],
): Promise<Cw20TokenBalance[]> {
  if (tokenContracts.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    tokenContracts.map(async (contract) => {
      const balance = await queryCw20Balance(
        restEndpoint,
        contract.contractAddress,
        walletAddress,
      );
      return {
        contractAddress: contract.contractAddress,
        balance,
        currency: contractInfoToCurrency(contract),
      };
    }),
  );

  const balances: Cw20TokenBalance[] = [];
  for (const result of results) {
    if (
      result.status === "fulfilled" &&
      BigInt(result.value.balance) > BigInt(0)
    ) {
      balances.push(result.value);
    }
  }

  return balances;
}
