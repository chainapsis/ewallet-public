import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";
import { resetSDKStates } from "@oko-wallet-user-dashboard/utils/sdk";

export function useSignOut() {
  const { wallet } = useOko();
  const { ethWallet } = useOkoEth();
  const { cosmosWallet } = useOkoCosmos();
  const { svmWallet } = useOkoSvm();
  const clearUserInfo = useUserInfoState((state) => state.clearUserInfo);
  const queryClient = useQueryClient();

  const signOut = useCallback(async () => {
    if (!wallet) {
      console.error("okoWallet is not initialized");
      return;
    }

    try {
      await wallet.signOut();
    } finally {
      resetSDKStates(ethWallet, cosmosWallet, svmWallet);
      queryClient.clear();
      clearUserInfo();
    }
  }, [wallet, ethWallet, cosmosWallet, svmWallet, queryClient, clearUserInfo]);

  return signOut;
}
