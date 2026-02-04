export interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface AlchemyTokenBalancesResult {
  address: string;
  tokenBalances: {
    contractAddress: string;
    tokenBalance: string;
  }[];
  pageKey?: string;
}

const MAX_PAGES = 5;

export async function fetchErc20TokenBalances(
  alchemyEndpoint: string,
  ownerAddress: string,
): Promise<AlchemyTokenBalance[]> {
  const balances: AlchemyTokenBalance[] = [];
  let pageKey: string | undefined;
  let page: number = 0;

  do {
    const params: unknown[] = [ownerAddress, "erc20"];
    if (pageKey) {
      params.push({ pageKey });
    }

    const response = await fetch(alchemyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params,
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `alchemy_getTokenBalances failed: ${response.statusText}`,
      );
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    const result: AlchemyTokenBalancesResult = data.result;

    for (const tb of result.tokenBalances) {
      const balance = BigInt(tb.tokenBalance);
      if (balance > BigInt(0)) {
        balances.push({
          contractAddress: tb.contractAddress.toLowerCase(),
          tokenBalance: balance.toString(),
        });
      }
    }

    pageKey = result.pageKey;
    page++;
  } while (pageKey && page < MAX_PAGES);

  return balances;
}
