import type { OkoCosmosWalletInterface } from "@oko-wallet/oko-sdk-cosmos";
import { useContext } from "react";

import { CosmosContext } from "./context";

export interface UseOkoCosmosReturn {
  cosmosWallet: OkoCosmosWalletInterface | null;
  isInitialized: boolean;
  isReady: boolean;
  address: string | null;
}

export function useOkoCosmos(): UseOkoCosmosReturn {
  const ctx = useContext(CosmosContext);

  return {
    cosmosWallet: ctx.instance,
    isInitialized: ctx.isInitialized,
    isReady: ctx.isReady,
    address: ctx.address,
  };
}
