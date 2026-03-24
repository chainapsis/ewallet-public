"use client";

import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useRouter } from "next/navigation";
import { type FC, type PropsWithChildren, useEffect } from "react";

import { WholePageLoading } from "@oko-wallet-user-dashboard/components/whole_page_loading/whole_page_loading";
import { paths } from "@oko-wallet-user-dashboard/paths";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

export const Authorized: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const { isReady: isCosmosInitialized } = useOkoCosmos();
  const { isReady: isEthInitialized } = useOkoEth();
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
