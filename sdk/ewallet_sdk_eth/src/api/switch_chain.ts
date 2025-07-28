import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export async function switchChain(
  this: EthEWallet,
  chainId: `0x${string}` | number,
): Promise<void> {
  const chainIdNumber =
    typeof chainId === "string" ? parseInt(chainId, 16) : chainId;

  const chain = this.chains.find((chain) => chain.id === chainIdNumber);
  if (!chain) {
    throw new Error(`Chain with id ${chainId} not found`);
  }

  this.activeChainId = chainIdNumber;

  // TODO: provider should be updated to use the new chain
}
