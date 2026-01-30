import {
  OkoCosmosWallet,
  type OkoCosmosWalletInterface,
} from "@oko-wallet/oko-sdk-cosmos";
import {
  OkoEthWallet,
  type OkoEthWalletInterface,
} from "@oko-wallet/oko-sdk-eth";
import {
  OkoSvmWallet,
  type OkoSvmWalletInterface,
} from "@oko-wallet/oko-sdk-svm";
import { create } from "zustand";
import { combine } from "zustand/middleware";

import { useUserInfoState } from "./user_info";
import {
  OKO_SDK_API_KEY,
  OKO_SDK_ENDPOINT,
} from "@oko-wallet-user-dashboard/fetch";

// SDK type identifiers
export type SDKType = "eth" | "cosmos" | "sol";

// Generic SDK status for each chain type
export interface SDKStatus<T = unknown> {
  instance: T | null;
  isInitializing: boolean;
  isLazyInitialized: boolean;
}

// Type-safe SDK instances
export type SDKInstances = {
  eth: OkoEthWalletInterface | null;
  cosmos: OkoCosmosWalletInterface | null;
  sol: OkoSvmWalletInterface | null;
};

// Event types
export interface AccountsChangedEvent {
  email: string | null;
  publicKey: string | null;
}

interface SDKState {
  sdks: {
    eth: SDKStatus<OkoEthWalletInterface>;
    cosmos: SDKStatus<OkoCosmosWalletInterface>;
    svm: SDKStatus<OkoSvmWalletInterface>;
  };
}

interface SDKActions {
  initOkoEth: () => Promise<OkoEthWalletInterface | null>;
  initOkoCosmos: () => Promise<OkoCosmosWalletInterface | null>;
  initOkoSvm: () => Promise<OkoSvmWalletInterface | null>;
}

const createInitialSDKStatus = <T>(): SDKStatus<T> => ({
  instance: null,
  isInitializing: false,
  isLazyInitialized: false,
});

const initialState: SDKState = {
  sdks: {
    eth: createInitialSDKStatus<OkoEthWalletInterface>(),
    cosmos: createInitialSDKStatus<OkoCosmosWalletInterface>(),
    svm: createInitialSDKStatus<OkoSvmWalletInterface>(),
  },
};

export const useSDKState = create(
  combine<SDKState, SDKActions>(initialState, (set, get) => ({
    initOkoEth: async () => {
      const { sdks } = get();
      const ethStatus = sdks.eth;

      if (ethStatus.instance || ethStatus.isInitializing) {
        console.log("ETH SDK already initialized or initializing, skipping...");
        return ethStatus.instance;
      }

      console.log("Initializing ETH SDK...");
      set({
        sdks: {
          ...sdks,
          eth: { ...ethStatus, isInitializing: true },
        },
      });

      if (!OKO_SDK_API_KEY) {
        console.error(
          "ETH SDK init fail: NEXT_PUBLIC_OKO_SDK_API_KEY is not set",
        );
        set({
          sdks: {
            ...get().sdks,
            eth: { ...ethStatus, isInitializing: false },
          },
        });
        return null;
      }

      const initRes = OkoEthWallet.init({
        api_key: OKO_SDK_API_KEY,
        sdk_endpoint: OKO_SDK_ENDPOINT,
      });

      if (initRes.success) {
        console.log("ETH SDK initialized");

        const okoEth = initRes.data;
        set({
          sdks: {
            ...get().sdks,
            eth: {
              instance: okoEth,
              isInitializing: false,
              isLazyInitialized: false,
            },
          },
        });

        await okoEth.waitUntilInitialized;
        set({
          sdks: {
            ...get().sdks,
            eth: { ...get().sdks.eth, isLazyInitialized: true },
          },
        });

        return okoEth;
      } else {
        console.error("ETH SDK init fail, err: %s", initRes.err);
        set({
          sdks: {
            ...get().sdks,
            eth: { ...ethStatus, isInitializing: false },
          },
        });

        return null;
      }
    },

    initOkoCosmos: async () => {
      const { sdks } = get();
      const cosmosStatus = sdks.cosmos;

      if (cosmosStatus.instance || cosmosStatus.isInitializing) {
        console.log(
          "Cosmos SDK already initialized or initializing, skipping...",
        );
        return cosmosStatus.instance;
      }

      console.log("Initializing Cosmos SDK...");
      set({
        sdks: {
          ...sdks,
          cosmos: { ...cosmosStatus, isInitializing: true },
        },
      });

      if (!OKO_SDK_API_KEY) {
        console.error(
          "Cosmos SDK init fail: NEXT_PUBLIC_OKO_SDK_API_KEY is not set",
        );
        set({
          sdks: {
            ...get().sdks,
            cosmos: { ...cosmosStatus, isInitializing: false },
          },
        });
        return null;
      }

      const initRes = OkoCosmosWallet.init({
        api_key: OKO_SDK_API_KEY,
        sdk_endpoint: OKO_SDK_ENDPOINT,
      });

      if (initRes.success) {
        console.log("Cosmos SDK initialized");

        const okoCosmos = initRes.data;

        // Setup auth state listener - updates user_info store directly
        okoCosmos.on({
          type: "accountsChanged",
          handler: ({ email, publicKey }) => {
            useUserInfoState.getState().setUserInfo({
              email: email || null,
              publicKey: publicKey
                ? Buffer.from(publicKey).toString("hex")
                : null,
            });
          },
        });

        set({
          sdks: {
            ...get().sdks,
            cosmos: {
              instance: okoCosmos,
              isInitializing: false,
              isLazyInitialized: false,
            },
          },
        });

        await okoCosmos.waitUntilInitialized;
        set({
          sdks: {
            ...get().sdks,
            cosmos: { ...get().sdks.cosmos, isLazyInitialized: true },
          },
        });

        return okoCosmos;
      } else {
        console.error("Cosmos SDK init fail, err: %s", initRes.err);
        set({
          sdks: {
            ...get().sdks,
            cosmos: { ...cosmosStatus, isInitializing: false },
          },
        });

        return null;
      }
    },

    initOkoSvm: async () => {
      const { sdks } = get();
      const svmStatus = sdks.svm;

      if (svmStatus.instance || svmStatus.isInitializing) {
        console.log("Sol SDK already initialized or initializing, skipping...");
        return svmStatus.instance;
      }

      console.log("Initializing Sol SDK...");
      set({
        sdks: {
          ...sdks,
          svm: { ...svmStatus, isInitializing: true },
        },
      });

      if (!OKO_SDK_API_KEY) {
        console.error(
          "Sol SDK init fail: NEXT_PUBLIC_OKO_SDK_API_KEY is not set",
        );
        set({
          sdks: {
            ...get().sdks,
            svm: { ...svmStatus, isInitializing: false },
          },
        });
        return null;
      }

      const initRes = OkoSvmWallet.init({
        api_key: OKO_SDK_API_KEY,
        sdk_endpoint: OKO_SDK_ENDPOINT,
      });

      if (initRes.success) {
        console.log("Sol SDK initialized");

        const okoSvm = initRes.data;
        set({
          sdks: {
            ...get().sdks,
            svm: {
              instance: okoSvm,
              isInitializing: false,
              isLazyInitialized: false,
            },
          },
        });

        await okoSvm.waitUntilInitialized;
        set({
          sdks: {
            ...get().sdks,
            svm: { ...get().sdks.svm, isLazyInitialized: true },
          },
        });

        return okoSvm;
      } else {
        console.error("Sol SDK init fail, err: %s", initRes.err);
        set({
          sdks: {
            ...get().sdks,
            svm: { ...svmStatus, isInitializing: false },
          },
        });

        return null;
      }
    },
  })),
);

// Convenience selectors for backward compatibility
export const selectEthSDK = (state: SDKState & SDKActions) =>
  state.sdks.eth.instance;
export const selectCosmosSDK = (state: SDKState & SDKActions) =>
  state.sdks.cosmos.instance;
export const selectSolSDK = (state: SDKState & SDKActions) =>
  state.sdks.svm.instance;
export const selectEthInitialized = (state: SDKState & SDKActions) =>
  state.sdks.eth.isLazyInitialized;
export const selectCosmosInitialized = (state: SDKState & SDKActions) =>
  state.sdks.cosmos.isLazyInitialized;
export const selectSolInitialized = (state: SDKState & SDKActions) =>
  state.sdks.svm.isLazyInitialized;
