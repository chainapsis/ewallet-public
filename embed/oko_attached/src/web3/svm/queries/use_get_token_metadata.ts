import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

const JUPITER_TOKEN_API_V2 = "https://api.jup.ag/tokens/v2";

export interface JupiterToken {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  icon: string | null;
  tags: string[];
  isVerified: boolean;
}

export type SvmTokenMetadataResult = {
  name?: string;
  symbol?: string;
  decimals?: number;
  icon?: string;
};

export interface UseGetSvmTokenMetadataProps {
  mintAddress?: string;
  options?: Partial<UseQueryOptions<SvmTokenMetadataResult>>;
}

async function fetchTokenMetadata(
  mintAddress: string,
): Promise<JupiterToken | null> {
  const url = `${JUPITER_TOKEN_API_V2}/search?query=${encodeURIComponent(mintAddress)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `Jupiter API error: ${response.status} ${response.statusText}`,
    );
  }

  const tokens: JupiterToken[] = await response.json();

  const token = tokens.find(
    (t) => t.id.toLowerCase() === mintAddress.toLowerCase(),
  );

  return token ?? null;
}

export function useGetSvmTokenMetadata({
  mintAddress,
  options,
}: UseGetSvmTokenMetadataProps) {
  return useQuery({
    queryKey: ["svm-token-metadata", mintAddress],
    queryFn: async (): Promise<SvmTokenMetadataResult> => {
      const defaultResult = {
        name: undefined,
        symbol: undefined,
        decimals: undefined,
        icon: undefined,
      };

      if (!mintAddress) {
        return defaultResult;
      }

      try {
        const token = await fetchTokenMetadata(mintAddress);
        if (!token) {
          return defaultResult;
        }
        return {
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          icon: token.icon ?? undefined,
        };
      } catch {
        return defaultResult;
      }
    },
    ...options,
    enabled: !!mintAddress && options?.enabled !== false,
  });
}
