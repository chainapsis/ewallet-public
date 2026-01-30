// TODO: refactor this file @chemonoworld @Ryz0nd

import { useEffect } from "react";

import { useSDKState } from "@oko-wallet-demo-web/state/sdk";

export function useInitOko() {
  const initOkoCosmos = useSDKState((state) => state.initOkoCosmos);
  const initOkoEth = useSDKState((state) => state.initOkoEth);
  const initOkoSvm = useSDKState((state) => state.initOkoSvm);

  const isInitialized = useSDKState(
    (state) =>
      state.oko_cosmos !== null &&
      state.oko_eth !== null &&
      state.oko_svm !== null,
  );

  useEffect(() => {
    initOkoCosmos();
    initOkoEth();
    initOkoSvm();
  }, []);

  return { isInitialized };
}
