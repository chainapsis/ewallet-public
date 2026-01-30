"use client";

import { type FC, type PropsWithChildren, useEffect } from "react";

import { useInitOko } from "./use_oko";
import { useChains } from "@oko-wallet-user-dashboard/hooks/queries";
import { useChainStore } from "@oko-wallet-user-dashboard/state/chains";
import {
  selectCosmosInitialized,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

export const OkoProvider: FC<PropsWithChildren> = ({ children }) => {
  useInitOko();

  // Initialize chain data fetching
  useChains();

  const setActiveUser = useChainStore((state) => state.setActiveUser);
  const clearActiveUser = useChainStore((state) => state.clearActiveUser);
  const { email, authType, isSignedIn, setAuthType } = useUserInfoState();

  const isCosmosLazyInitialized = useSDKState(selectCosmosInitialized);

  useEffect(() => {
    if (email && authType) {
      setActiveUser(authType, email);
      return;
    }

    clearActiveUser();
  }, [email, authType, setActiveUser, clearActiveUser]);

  useEffect(() => {
    if (!isCosmosLazyInitialized) {
      return;
    }
    if (isSignedIn) {
      return;
    }
    setAuthType(null);
  }, [isCosmosLazyInitialized, isSignedIn, setAuthType]);

  return <>{children}</>;
};
