"use client";

import { useRouter } from "next/navigation";
import { type FC, type PropsWithChildren, useEffect } from "react";

import { WholePageLoading } from "@oko-wallet-user-dashboard/components/whole_page_loading/whole_page_loading";
import { paths } from "@oko-wallet-user-dashboard/paths";
import {
  selectCosmosInitialized,
  selectEthInitialized,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

export const Authorized: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const isCosmosInitialized = useSDKState(selectCosmosInitialized);
  const isEthInitialized = useSDKState(selectEthInitialized);
  const isSignedIn = useUserInfoState((state) => state.isSignedIn);

  const isSDKReady = isCosmosInitialized && isEthInitialized;

  useEffect(() => {
    if (isSDKReady && !isSignedIn) {
      router.push(paths.sign_in);
    }
  }, [router, isSignedIn, isSDKReady]);

  if (!isSDKReady || !isSignedIn) {
    return <WholePageLoading />;
  }

  return <>{children}</>;
};
