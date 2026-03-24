"use client";

import { type FC, useEffect, useRef } from "react";
import { toast } from "sonner";

import { AutoEnableToast } from "./auto_enable_toast";
import { useTokenScan } from "@oko-wallet-user-dashboard/hooks/use_token_scan";
import { useChainStore } from "@oko-wallet-user-dashboard/state/chains";

export const TokenScan: FC = () => {
  const { results, isShowedAutoEnableToast, markToastShown } = useTokenScan();
  const enableChains = useChainStore((state) => state.enableChains);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (
      results.length === 0 ||
      isShowedAutoEnableToast ||
      toastIdRef.current != null
    ) {
      return;
    }

    enableChains(...results.map((r) => r.chainId));
    markToastShown();
    toastIdRef.current = toast.custom(
      (id) => (
        <AutoEnableToast
          results={results}
          onClose={() => {
            toast.dismiss(id);
            toastIdRef.current = null;
          }}
        />
      ),
      {
        duration: 5000,
        position: "top-center",
      },
    );
  }, [results, isShowedAutoEnableToast, markToastShown, enableChains]);

  return null;
};
