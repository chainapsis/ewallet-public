import type { OkoSvmWalletInterface } from "@oko-wallet/oko-sdk-svm";
import { useContext } from "react";

import { SvmContext } from "./context";

export interface UseOkoSvmReturn {
  svmWallet: OkoSvmWalletInterface | null;
  isInitialized: boolean;
  isReady: boolean;
}

export function useOkoSvm(): UseOkoSvmReturn {
  const ctx = useContext(SvmContext);

  return {
    svmWallet: ctx.instance,
    isInitialized: ctx.isInitialized,
    isReady: ctx.isReady,
  };
}
