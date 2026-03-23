import { useCallback, useContext } from "react";

import { OkoContext } from "../context";
import type { UseOkoModalReturn } from "../types";

export function useOkoModal(): UseOkoModalReturn {
  const { state } = useContext(OkoContext);

  const openModal: UseOkoModalReturn["openModal"] = useCallback(
    (msg) => {
      if (!state.wallet) {
        throw new Error("[oko-react] Cannot openModal: wallet not initialized");
      }
      return state.wallet.openModal(msg);
    },
    [state.wallet],
  );

  const closeModal = useCallback(() => {
    state.wallet?.closeModal();
  }, [state.wallet]);

  const openSignInModal = useCallback(async () => {
    if (!state.wallet) {
      throw new Error(
        "[oko-react] Cannot openSignInModal: wallet not initialized",
      );
    }
    await state.wallet.openSignInModal();
  }, [state.wallet]);

  return { openModal, closeModal, openSignInModal };
}
