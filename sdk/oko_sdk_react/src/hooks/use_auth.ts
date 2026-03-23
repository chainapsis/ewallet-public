import { useCallback, useContext } from "react";

import { OkoContext } from "../context";
import type { SignInType, UseAuthReturn } from "../types";

export function useAuth(): UseAuthReturn {
  const { state } = useContext(OkoContext);

  const signIn = useCallback(
    async (type: SignInType) => {
      if (!state.wallet) {
        throw new Error("[oko-react] Cannot signIn: wallet not initialized");
      }
      await state.wallet.signIn(type);
    },
    [state.wallet],
  );

  const signOut = useCallback(async () => {
    if (!state.wallet) {
      throw new Error("[oko-react] Cannot signOut: wallet not initialized");
    }
    await state.wallet.signOut();
  }, [state.wallet]);

  const openSignInModal = useCallback(async () => {
    if (!state.wallet) {
      throw new Error(
        "[oko-react] Cannot openSignInModal: wallet not initialized",
      );
    }
    await state.wallet.openSignInModal();
  }, [state.wallet]);

  return {
    isSignedIn: state.publicKey !== null,
    authType: state.authType,
    signIn,
    signOut,
    openSignInModal,
  };
}
