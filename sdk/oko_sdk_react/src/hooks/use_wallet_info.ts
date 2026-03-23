import { useContext } from "react";

import { OkoContext } from "../context";
import type { UseWalletInfoReturn } from "../types";

export function useWalletInfo(): UseWalletInfoReturn {
  const { state } = useContext(OkoContext);

  return {
    email: state.email,
    name: state.name,
    publicKey: state.publicKey,
    isReady: state.isReady,
  };
}
