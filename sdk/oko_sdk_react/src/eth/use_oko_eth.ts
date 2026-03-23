import type { OkoEthWalletInterface } from "@oko-wallet/oko-sdk-eth";
import { useContext } from "react";

import { EthContext } from "./context";

export interface UseOkoEthReturn {
  ethWallet: OkoEthWalletInterface | null;
  isInitialized: boolean;
  isReady: boolean;
}

export function useOkoEth(): UseOkoEthReturn {
  const ctx = useContext(EthContext);

  return {
    ethWallet: ctx.instance,
    isInitialized: ctx.isInitialized,
    isReady: ctx.isReady,
  };
}
