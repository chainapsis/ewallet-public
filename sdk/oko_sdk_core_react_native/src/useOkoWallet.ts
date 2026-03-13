import { useContext } from "react";

import { OkoWalletContext } from "./OkoWalletProvider";
import type { OkoWalletRN } from "./OkoWalletRN";

export function useOkoWallet(): OkoWalletRN {
  const wallet = useContext(OkoWalletContext);

  if (!wallet) {
    throw new Error(
      "[oko-rn] useOkoWallet must be used within an OkoWalletProvider",
    );
  }

  return wallet;
}
