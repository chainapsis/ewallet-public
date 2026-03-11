import type { Currency } from "@oko-wallet-user-dashboard/types/chain";
import { getChainIdentifier } from "@oko-wallet-user-dashboard/utils/chain";

const CHAINAPSIS_FACTORY_API =
  "https://pjld2aanw3elvteui4gwyxgx4m0ceweg.lambda-url.us-west-2.on.aws";

interface FactoryTokenResponse {
  coinMinimalDenom: string;
  coinDenom: string;
  coinDecimals: number;
  coinImageUrl?: string;
  coinGeckoId?: string;
}

const cache = new Map<string, Currency>();

function cacheKey(chainId: string, denom: string): string {
  return `${getChainIdentifier(chainId)}:${denom}`;
}

export async function fetchFactoryTokenMeta(
  chainId: string,
  denoms: string[],
): Promise<Map<string, Currency>> {
  const result = new Map<string, Currency>();
  const uncached: string[] = [];

  for (const denom of denoms) {
    const cached = cache.get(cacheKey(chainId, denom));
    if (cached) {
      result.set(denom, cached);
    } else {
      uncached.push(denom);
    }
  }

  if (uncached.length === 0) {
    return result;
  }

  const chainIdentifier = getChainIdentifier(chainId);
  const body = uncached.map((denom) => ({
    chainIdentifier,
    coinMinimalDenom: denom,
  }));

  const response = await fetch(`${CHAINAPSIS_FACTORY_API}/yacar/token-factory/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Factory token meta fetch failed: ${response.statusText}`);
  }

  const data: FactoryTokenResponse[] = await response.json();

  for (const token of data) {
    const currency: Currency = {
      coinDenom: token.coinDenom,
      coinMinimalDenom: token.coinMinimalDenom,
      coinDecimals: token.coinDecimals,
      coinImageUrl: token.coinImageUrl ?? undefined,
      coinGeckoId: token.coinGeckoId ?? undefined,
    };
    cache.set(cacheKey(chainId, token.coinMinimalDenom), currency);
    result.set(token.coinMinimalDenom, currency);
  }

  return result;
}
