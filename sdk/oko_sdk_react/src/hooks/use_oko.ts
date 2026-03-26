import { useCallback, useContext } from "react";

import { OkoContext } from "../context";
import type { OkoWalletTheme, SignInType, UseOkoReturn } from "../types";

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

  const setTheme = useCallback(
    async (theme: OkoWalletTheme) => {
      if (!state.wallet) {
        throw new Error("[oko-react] Cannot setTheme: wallet not initialized");
      }
      await state.wallet.setTheme(theme);
    },
    [state.wallet],
  );

  return {
    wallet: state.wallet,
    isReady: state.isReady,
    isSignedIn: state.publicKey !== null,
    authType: state.authType,
    email: state.email,
    name: state.name,
    publicKey: state.publicKey,
    signIn,
    signOut,
    openSignInModal,
    setTheme,
  };
}
