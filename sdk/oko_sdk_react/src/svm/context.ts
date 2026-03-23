import type { OkoSvmWalletInterface } from "@oko-wallet/oko-sdk-svm";
import { createContext } from "react";

export interface SvmContextValue {
  instance: OkoSvmWalletInterface | null;
  isInitialized: boolean;
  isReady: boolean;
}

export const SvmContext = createContext<SvmContextValue>({
  instance: null,
  isInitialized: false,
  isReady: false,
});
