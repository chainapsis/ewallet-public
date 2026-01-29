import { useEffect } from "react";

import {
  selectCosmosSDK,
  selectEthSDK,
  selectSolSDK,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";

export function useInitOko() {
  const initOkoCosmos = useSDKState((state) => state.initOkoCosmos);
  const initOkoEth = useSDKState((state) => state.initOkoEth);
  const initOkoSvm = useSDKState((state) => state.initOkoSvm);

  const isInitialized = useSDKState(
    (state) =>
      selectEthSDK(state) !== null &&
      selectCosmosSDK(state) !== null &&
      selectSolSDK(state) !== null,
  );

  useEffect(() => {
    initOkoCosmos();
    initOkoEth();
    initOkoSvm();
  }, [initOkoCosmos, initOkoEth, initOkoSvm]);

  return { isInitialized };
}
