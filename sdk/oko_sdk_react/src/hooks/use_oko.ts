import { useCallback, useContext, useMemo } from "react";

import { OkoContext } from "../context";
import type { SignInType, UseOkoReturn } from "../types";

export function useOko(): UseOkoReturn {
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

  const walletInfo = useMemo(
    () => ({
      authType: state.authType,
      email: state.email,
      name: state.name,
      publicKey: state.publicKey,
    }),
    [state.authType, state.email, state.name, state.publicKey],
  );

  return {
    wallet: state.wallet,
    isReady: state.isReady,
    isSignedIn: state.publicKey !== null,
    signIn,
    signOut,
    openSignInModal,
    walletInfo,
  };
}
