import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

/**
 * Dummy function for Keplr interface compatibility.
 * This function is provided to match the Keplr API and does nothing.
 * It can be safely called and awaited, but has no effect.
 *
 * @param _chainId - The chain ID (unused)
 */
export async function enable(
  this: CosmosEWallet,
  _chainId: string,
): Promise<void> {
  return;
}
