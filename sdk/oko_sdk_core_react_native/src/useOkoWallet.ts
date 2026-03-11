import { useContext } from "react";
import { OkoWalletContext } from "./OkoWalletProvider";
import type { OkoWalletRN } from "./OkoWalletRN";

/**
 * Hook to access the OkoWalletRN instance from the nearest OkoWalletProvider.
 *
 * Usage:
 * ```tsx
 * const okoWallet = useOkoWallet();
 * await okoWallet.signIn("google");
 * ```
 *
 * The returned instance can also be passed to chain SDK constructors:
 * ```tsx
 * const cosmosWallet = new OkoCosmosWallet(okoWallet);
 * ```
 */
export function useOkoWallet(): OkoWalletRN {
  const wallet = useContext(OkoWalletContext);

  if (!wallet) {
    throw new Error(
      "[oko-rn] useOkoWallet must be used within an OkoWalletProvider",
    );
  }

  return wallet;
}
