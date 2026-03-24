"use client";

import { OkoProvider as OkoSDKProvider } from "@oko-wallet/oko-sdk-react";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { type FC, type PropsWithChildren, useEffect } from "react";

import {
  OKO_SDK_API_KEY,
  OKO_SDK_ENDPOINT,
} from "@oko-wallet-user-dashboard/fetch";
import { useChains } from "@oko-wallet-user-dashboard/hooks/queries";
import { useSDKListeners } from "@oko-wallet-user-dashboard/hooks/use_sdk_listeners";
import { useChainStore } from "@oko-wallet-user-dashboard/state/chains";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";
import { SOLANA_MAINNET_CHAIN_ID } from "@oko-wallet-user-dashboard/utils/chain";

const okoConfig = {
  apiKey: OKO_SDK_API_KEY ?? "",
  sdkEndpoint: OKO_SDK_ENDPOINT,
  eth: true as const,
  cosmos: true as const,
  svm: { chainId: SOLANA_MAINNET_CHAIN_ID },
};

const InnerProvider: FC<PropsWithChildren> = ({ children }) => {
  useSDKListeners();
  useChains();

  const setActiveUser = useChainStore((state) => state.setActiveUser);
  const clearActiveUser = useChainStore((state) => state.clearActiveUser);
  const { publicKey, authType, isSignedIn, setAuthType } = useUserInfoState();

  const { isReady: isCosmosLazyInitialized } = useOkoCosmos();

  useEffect(() => {
    if (publicKey && authType) {
      setActiveUser(authType, publicKey);
      return;
    }

    clearActiveUser();
  }, [publicKey, authType, setActiveUser, clearActiveUser]);

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

export const OkoProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <OkoSDKProvider config={okoConfig}>
      <InnerProvider>{children}</InnerProvider>
    </OkoSDKProvider>
  );
};
