const ALCHEMY_SUPPORTED_CHAIN_IDS: ReadonlySet<number> = new Set([
  1, 8453, 42161, 10, 137,
]);

export function getAlchemyEndpoint(evmChainId: number): string {
  return `https://evm-${evmChainId}.keplr.app/api`;
}

export function isAlchemySupported(evmChainId: number): boolean {
  return ALCHEMY_SUPPORTED_CHAIN_IDS.has(evmChainId);
}
