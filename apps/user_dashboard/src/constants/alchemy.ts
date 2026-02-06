const ALCHEMY_SUPPORTED_CHAIN_IDS: ReadonlySet<number> = new Set([
  1, // Ethereum
  8453, // Base
  42161, // Arbitrum
  10, // Optimism
  137, // Polygon
]);

export function getAlchemyEndpoint(evmChainId: number): string {
  return `https://evm-${evmChainId}.keplr.app/api`;
}

export function isAlchemySupported(evmChainId: number): boolean {
  return ALCHEMY_SUPPORTED_CHAIN_IDS.has(evmChainId);
}
