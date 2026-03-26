"use client";

import {
  OkoProvider as OkoSDKProvider,
  useOko,
} from "@oko-wallet/oko-sdk-react";
import { type FC, type PropsWithChildren, useEffect } from "react";

import {
  OKO_SDK_API_KEY,
  OKO_SDK_ENDPOINT,
} from "@oko-wallet-user-dashboard/fetch";
import { useChains } from "@oko-wallet-user-dashboard/hooks/queries";
import { useChainStore } from "@oko-wallet-user-dashboard/state/chains";
import { SOLANA_MAINNET_CHAIN_ID } from "@oko-wallet-user-dashboard/utils/chain";

if (!OKO_SDK_API_KEY) {
  throw new Error("OKO_SDK_API_KEY is not set");
}

const okoConfig = {
  apiKey: OKO_SDK_API_KEY,
  sdkEndpoint: OKO_SDK_ENDPOINT,
  eth: true as const,
  cosmos: true as const,
  svm: { chainId: SOLANA_MAINNET_CHAIN_ID },
};

const InnerProvider: FC<PropsWithChildren> = ({ children }) => {
  useChains();

  const setActiveUser = useChainStore((state) => state.setActiveUser);
  const clearActiveUser = useChainStore((state) => state.clearActiveUser);
  const { authType, publicKey } = useOko();

  useEffect(() => {
    if (publicKey && authType) {
      setActiveUser(authType, publicKey);
      return;
    }

    clearActiveUser();
  }, [publicKey, authType, setActiveUser, clearActiveUser]);

  return <>{children}</>;
};

export const OkoProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <OkoSDKProvider config={okoConfig}>
      <InnerProvider>{children}</InnerProvider>
    </OkoSDKProvider>
  );
};
