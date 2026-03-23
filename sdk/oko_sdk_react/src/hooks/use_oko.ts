import { useContext } from "react";

import { OkoContext } from "../context";
import type { UseOkoReturn } from "../types";

export function useOko(): UseOkoReturn {
  const { state } = useContext(OkoContext);

  return {
    wallet: state.wallet,
    isInitialized: state.isInitialized,
    isReady: state.isReady,
    error: state.error,
  };
}
