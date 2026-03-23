import type { RawBalance } from "@oko-wallet-user-dashboard/types/token";

interface FetchCosmosRawBalancesOptions {
  paginationLimit?: number;
}

export async function fetchCosmosRawBalances(
  restEndpoint: string,
  cosmosAddress: string,
  options?: FetchCosmosRawBalancesOptions,
): Promise<RawBalance[]> {
  const { paginationLimit } = options ?? {};
  const params = paginationLimit ? `?pagination.limit=${paginationLimit}` : "";
  const response = await fetch(
    `${restEndpoint}/cosmos/bank/v1beta1/balances/${cosmosAddress}${params}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.balances ?? []) as RawBalance[];
}
