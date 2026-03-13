import type { ChainInfo } from "@keplr-wallet/types";

const CHAIN_INFO_ENDPOINT = "https://keplr-api.keplr.app/v1/chains/all";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface ChainInfoResponse {
  chains: ChainInfo[];
}

let cachedChains: ChainInfo[] | null = null;
let cacheTimestamp = 0;

async function getAllChains(): Promise<ChainInfo[]> {
  const now = Date.now();
  if (cachedChains && now - cacheTimestamp < CACHE_TTL) {
    return cachedChains;
  }

  const response = await fetch(CHAIN_INFO_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Failed to fetch chain info: ${response.status}`);
  }
  const json = (await response.json()) as ChainInfoResponse | null;
  if (!json) {
    throw new Error("Empty chain info response");
  }

  cachedChains = json.chains ?? [];
  cacheTimestamp = now;
  return cachedChains;
}

function filterEthChains(chains: ChainInfo[]): ChainInfo[] {
  return chains.filter((c) => c.chainId.startsWith("eip155:"));
}

function filterCosmosChains(chains: ChainInfo[]): ChainInfo[] {
  return chains.filter((c) => "bech32Config" in c);
}

/** Replicates ChainIdHelper.parse(chainId).identifier from @keplr-wallet/cosmos */
function parseChainIdentifier(chainId: string): string {
  const lastDashIdx = chainId.lastIndexOf("-");
  if (lastDashIdx >= 0) {
    const suffix = chainId.slice(lastDashIdx + 1);
    if (/^\d+$/.test(suffix)) {
      return chainId.slice(0, lastDashIdx);
    }
  }
  return chainId;
}

export async function getEthChainInfo(
  chainId: string | null,
): Promise<ChainInfo[]> {
  const allChains = await getAllChains();
  const ethChains = filterEthChains(allChains);

  if (!chainId) {
    return ethChains;
  }

  const formattedChainId = chainId.startsWith("eip155:")
    ? chainId
    : `eip155:${parseInt(chainId, 10)}`;

  const found = ethChains.find((c) => c.chainId === formattedChainId);
  if (!found) {
    throw new Error(`Chain not found: ${formattedChainId}`);
  }
  return [found];
}

export async function getCosmosChainInfo(
  chainId: string | null,
): Promise<ChainInfo[]> {
  const allChains = await getAllChains();
  const cosmosChains = filterCosmosChains(allChains);

  if (!chainId) {
    return cosmosChains;
  }

  const identifier = parseChainIdentifier(chainId);
  const found = cosmosChains.find(
    (c) => parseChainIdentifier(c.chainId) === identifier,
  );
  if (!found) {
    throw new Error(`Chain not found: ${identifier}`);
  }
  return [found];
}
