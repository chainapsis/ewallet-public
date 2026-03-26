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

const defaultChainCtxWithAddress = {
  ...defaultChainCtx,
  address: null,
};

interface OkoProviderProps extends PropsWithChildren {
  config: OkoProviderConfig;
}

export const OkoProvider: FC<OkoProviderProps> = ({ config, children }) => {
  const [state, dispatch] = useReducer(coreReducer, initialCoreState);
  const initCalledRef = useRef(false);

  const [ethCtx, setEthCtx] = useState<EthContextValue>(
    defaultChainCtxWithAddress,
  );
  const [cosmosCtx, setCosmosCtx] =
    useState<CosmosContextValue>(defaultChainCtx);
  const [svmCtx, setSvmCtx] = useState<SvmContextValue>(
    defaultChainCtxWithAddress,
  );

  // Init SDK singleton (once only)
  useEffect(() => {
    if (initCalledRef.current) {
      return;
    }
    initCalledRef.current = true;

    const coreResult = OkoWallet.init({
      api_key: config.apiKey,
      sdk_endpoint: config.sdkEndpoint,
      theme: config.theme,
    });

    if (!coreResult.success) {
      console.error("[oko-react] init failed:", coreResult.err);
      return;
    }

    const wallet = coreResult.data;
    dispatch({ type: "INIT_SUCCESS", wallet });

    wallet.waitUntilInitialized.then((res) => {
      if (res.success) {
        dispatch({ type: "READY", state: res.data });
      }
    });

    initChainSDKs(config, setEthCtx, setCosmosCtx, setSvmCtx);
  }, []);

  // Subscribe to events (re-registers on every mount for Strict Mode compat)
  useEffect(() => {
    if (!state.wallet) {
      return;
    }

    const wallet = state.wallet;

    const accountsChangedHandler = (payload: {
      authType: typeof state.authType;
      email: string | null;
      publicKey: string | null;
      name: string | null;
    }) => {
      dispatch({
        type: "ACCOUNTS_CHANGED",
        authType: payload.authType,
        email: payload.email,
        publicKey: payload.publicKey,
        name: payload.name,
      });
    };

    wallet.on({
      type: "CORE__accountsChanged",
      handler: accountsChangedHandler,
    });

    return () => {
      wallet.off({
        type: "CORE__accountsChanged",
        handler: accountsChangedHandler,
      });
    };
  }, [state.wallet]);

  // ETH address listener
  useEffect(() => {
    const ethWallet = ethCtx.instance;
    if (!ethWallet) {
      return;
    }

    let cancelled = false;
    let provider: Awaited<
      ReturnType<typeof ethWallet.getEthereumProvider>
    > | null = null;

    const ethAccountsHandler = (accounts: string[]) => {
      setEthCtx((prev) => ({
        ...prev,
        address: accounts[0] ?? null,
      }));
    };

    ethWallet
      .getEthereumProvider()
      .then((p) => {
        if (cancelled) {
          return;
        }
        provider = p;
        provider.on("accountsChanged", ethAccountsHandler);

        // Read current address after subscribing to guard against state set
        // before the listener was attached (e.g. already-signed-in page load).
        const currentAddress = ethWallet.state.address;
        if (currentAddress !== null) {
          setEthCtx((prev) =>
            prev.address === currentAddress
              ? prev
              : { ...prev, address: currentAddress },
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[oko-react] ETH provider init failed:", err);
        }
      });

    return () => {
      cancelled = true;
      if (provider) {
        provider.removeListener("accountsChanged", ethAccountsHandler);
      }
    };
  }, [ethCtx.instance]);

  // SVM address listener
  useEffect(() => {
    const svmWallet = svmCtx.instance;
    if (!svmWallet) {
      return;
    }

    const svmAccountHandler = (publicKey: { toBase58(): string } | null) => {
      setSvmCtx((prev) => ({
        ...prev,
        address: publicKey?.toBase58() ?? null,
      }));
    };

    svmWallet.on("accountChanged", svmAccountHandler);

    return () => {
      svmWallet.off("accountChanged", svmAccountHandler);
    };
  }, [svmCtx.instance]);

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
        const ethWallet = res.data;
        setEthCtx({
          instance: ethWallet,
          isInitialized: true,
          isReady: false,
          address: null,
        });
        ethWallet.waitUntilInitialized.then((initRes) => {
          if (!initRes.success) {
            console.error("[oko-react] ETH lazy init failed:", initRes.err);
            return;
          }
          setEthCtx((prev) => ({
            ...prev,
            isReady: true,
            address: ethWallet.state.address ?? null,
          }));
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
        res.data.waitUntilInitialized.then((initRes) => {
          if (!initRes.success) {
            console.error("[oko-react] Cosmos lazy init failed:", initRes.err);
            return;
          }
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
        const svmWallet = res.data;
        setSvmCtx({
          instance: svmWallet,
          isInitialized: true,
          isReady: false,
          address: null,
        });
        svmWallet.waitUntilInitialized.then((initRes) => {
          if (!initRes.success) {
            console.error("[oko-react] SVM lazy init failed:", initRes.err);
            return;
          }
          setSvmCtx((prev) => ({
            ...prev,
            isReady: true,
            address: svmWallet.state.publicKey?.toBase58() ?? null,
          }));
        });
      }
    } catch {
      console.warn("[oko-react] @oko-wallet/oko-sdk-svm is not installed");
    }
  }
}
