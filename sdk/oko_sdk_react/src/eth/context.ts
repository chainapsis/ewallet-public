import type { OkoEthWalletInterface } from "@oko-wallet/oko-sdk-eth";
import { createContext } from "react";

export interface EthContextValue {
  instance: OkoEthWalletInterface | null;
  isInitialized: boolean;
  isReady: boolean;
  address: string | null;
}

export const EthContext = createContext<EthContextValue>({
  instance: null,
  isInitialized: false,
  isReady: false,
  address: null,
});
