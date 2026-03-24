import { OkoWallet } from "@oko-wallet/oko-sdk-core";
import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { OkoContext } from "./context";
import { CosmosContext, type CosmosContextValue } from "./cosmos/context";
import { EthContext, type EthContextValue } from "./eth/context";
import { coreReducer, initialCoreState } from "./reducer";
import { SvmContext, type SvmContextValue } from "./svm/context";
import type { OkoProviderConfig, OkoSvmConfig } from "./types";

const defaultChainCtx = {
  instance: null,
  isInitialized: false,
  isReady: false,
};

interface OkoProviderProps extends PropsWithChildren {
  config: OkoProviderConfig;
}

export const OkoProvider: FC<OkoProviderProps> = ({ config, children }) => {
  const [state, dispatch] = useReducer(coreReducer, initialCoreState);
  const initCalledRef = useRef(false);

  const [ethCtx, setEthCtx] = useState<EthContextValue>(defaultChainCtx);
  const [cosmosCtx, setCosmosCtx] =
    useState<CosmosContextValue>(defaultChainCtx);
  const [svmCtx, setSvmCtx] = useState<SvmContextValue>(defaultChainCtx);

  useEffect(() => {
    if (initCalledRef.current) {
      return;
    }
    initCalledRef.current = true;

    const coreResult = OkoWallet.init({
      api_key: config.apiKey,
      sdk_endpoint: config.sdkEndpoint,
    });

    if (!coreResult.success) {
      console.error("[oko-react] init failed:", coreResult.err);
      return;
    }

    const wallet = coreResult.data;
    dispatch({ type: "INIT_SUCCESS", wallet });

    wallet.on({
      type: "CORE__accountsChanged",
      handler: (payload) => {
        dispatch({
          type: "ACCOUNTS_CHANGED",
          authType: payload.authType,
          email: payload.email,
          publicKey: payload.publicKey,
          name: payload.name,
        });
      },
    });

    wallet.waitUntilInitialized.then((res) => {
      if (res.success) {
        dispatch({ type: "READY", state: res.data });
      }
    });

    initChainSDKs(config, setEthCtx, setCosmosCtx, setSvmCtx);
  }, []);

  return (
    <OkoContext.Provider value={{ state, dispatch }}>
      <EthContext.Provider value={ethCtx}>
        <CosmosContext.Provider value={cosmosCtx}>
          <SvmContext.Provider value={svmCtx}>{children}</SvmContext.Provider>
        </CosmosContext.Provider>
      </EthContext.Provider>
    </OkoContext.Provider>
  );
};

async function initChainSDKs(
  config: OkoProviderConfig,
  setEthCtx: React.Dispatch<React.SetStateAction<EthContextValue>>,
  setCosmosCtx: React.Dispatch<React.SetStateAction<CosmosContextValue>>,
  setSvmCtx: React.Dispatch<React.SetStateAction<SvmContextValue>>,
) {
  const initArgs = {
    api_key: config.apiKey,
    sdk_endpoint: config.sdkEndpoint,
  };

  if (config.eth) {
    try {
      const { OkoEthWallet } = await import("@oko-wallet/oko-sdk-eth");
      const res = OkoEthWallet.init(initArgs);
      if (res.success) {
        setEthCtx({ instance: res.data, isInitialized: true, isReady: false });
        res.data.waitUntilInitialized.then(() => {
          setEthCtx((prev) => ({ ...prev, isReady: true }));
        });
      }
    } catch {
      console.warn("[oko-react] @oko-wallet/oko-sdk-eth is not installed");
    }
  }

  if (config.cosmos) {
    try {
      const { OkoCosmosWallet } = await import("@oko-wallet/oko-sdk-cosmos");
      const res = OkoCosmosWallet.init(initArgs);
      if (res.success) {
        setCosmosCtx({
          instance: res.data,
          isInitialized: true,
          isReady: false,
        });
        res.data.waitUntilInitialized.then(() => {
          setCosmosCtx((prev) => ({ ...prev, isReady: true }));
        });
      }
    } catch {
      console.warn("[oko-react] @oko-wallet/oko-sdk-cosmos is not installed");
    }
  }

  if (config.svm) {
    const svmConfig: OkoSvmConfig =
      typeof config.svm === "object"
        ? config.svm
        : { chainId: "solana:mainnet" };
    try {
      const { OkoSvmWallet } = await import("@oko-wallet/oko-sdk-svm");
      const res = OkoSvmWallet.init({
        ...initArgs,
        chain_id: svmConfig.chainId,
      });
      if (res.success) {
        setSvmCtx({ instance: res.data, isInitialized: true, isReady: false });
        res.data.waitUntilInitialized.then(() => {
          setSvmCtx((prev) => ({ ...prev, isReady: true }));
        });
      }
    } catch {
      console.warn("[oko-react] @oko-wallet/oko-sdk-svm is not installed");
    }
  }
}
