import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  selectCosmosSDK,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

export function useSignOut() {
  const okoWallet = useSDKState(selectCosmosSDK)?.okoWallet;
  const resetStates = useSDKState((state) => state.resetStates);
  const clearUserInfo = useUserInfoState((state) => state.clearUserInfo);
  const queryClient = useQueryClient();

  const signOut = useCallback(async () => {
    if (!okoWallet) {
      console.error("okoWallet is not initialized");
      return;
    }

    try {
      await okoWallet.signOut();
    } finally {
      resetStates();
      queryClient.clear();
      clearUserInfo();
    }
  }, [okoWallet, resetStates, queryClient, clearUserInfo]);

  return signOut;
}
