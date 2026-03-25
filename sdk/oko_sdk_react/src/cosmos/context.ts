import type { OkoCosmosWalletInterface } from "@oko-wallet/oko-sdk-cosmos";
import { createContext } from "react";

export interface CosmosContextValue {
  instance: OkoCosmosWalletInterface | null;
  isInitialized: boolean;
  isReady: boolean;
  address: string | null;
}

export const CosmosContext = createContext<CosmosContextValue>({
  instance: null,
  isInitialized: false,
  isReady: false,
  address: null,
});
