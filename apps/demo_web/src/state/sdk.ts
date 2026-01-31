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

import { useUserInfoState } from "@oko-wallet-demo-web/state/user_info";

interface SDKState {
  oko_eth: OkoEthWalletInterface | null;
  oko_cosmos: OkoCosmosWalletInterface | null;
  oko_svm: OkoSvmWalletInterface | null;

  isEthInitializing: boolean;
  isEthLazyInitialized: boolean;

  isCosmosInitializing: boolean;
  isCosmosLazyInitialized: boolean;

  isSolInitializing: boolean;
  isSolLazyInitialized: boolean;
}

interface SDKActions {
  initOkoEth: () => Promise<OkoEthWalletInterface | null>;
  initOkoCosmos: () => Promise<OkoCosmosWalletInterface | null>;
  initOkoSvm: () => Promise<OkoSvmWalletInterface | null>;
}

const initialState: SDKState = {
  oko_eth: null,
  oko_cosmos: null,
  oko_svm: null,

  isEthInitializing: false,
  isEthLazyInitialized: false,

  isCosmosInitializing: false,
  isCosmosLazyInitialized: false,

  isSolInitializing: false,
  isSolLazyInitialized: false,
};

export const useSDKState = create(
  combine<SDKState, SDKActions>(initialState, (set, get) => ({
    initOkoEth: async () => {
      const state = get();

      if (state.oko_eth || state.isEthInitializing) {
        console.log("ETH SDK already initialized or initializing, skipping...");
        return state.oko_eth;
      }

      console.log("Initializing ETH SDK...");
      set({
        isEthInitializing: true,
      });

      const initRes = OkoEthWallet.init({
        api_key:
          "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c",
        sdk_endpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
      });

      if (initRes.success) {
        console.log("Eth sdk initialized");

        const okoEth = initRes.data;
        set({
          oko_eth: initRes.data,
          isEthInitializing: false,
        });

        await okoEth.waitUntilInitialized;
        set({
          isEthLazyInitialized: true,
        });

        return okoEth;
      } else {
        console.error("sdk init fail, err: %s", initRes.err);
        set({ isEthInitializing: false });

        return null;
      }
    },
    initOkoCosmos: async () => {
      const state = get();

      if (state.oko_cosmos) {
        console.log(
          "Cosmos SDK already initialized or initializing, skipping...",
        );
        return state.oko_cosmos;
      }

      console.log("Initializing Cosmos SDK...");
      set({
        isCosmosInitializing: true,
      });

      const initRes = OkoCosmosWallet.init({
        api_key:
          "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c",
        sdk_endpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
      });

      if (initRes.success) {
        console.log("Cosmos SDK initialized");

        const okoCosmos = initRes.data;
        setupCosmosListener(okoCosmos);

        set({
          oko_cosmos: okoCosmos,
          isCosmosInitializing: false,
        });

        await okoCosmos.waitUntilInitialized;
        set({
          isCosmosLazyInitialized: true,
        });

        return okoCosmos;
      } else {
        console.error("Cosmos sdk init fail, err: %s", initRes.err);

        set({ isCosmosInitializing: false });

        return null;
      }
    },
    initOkoSvm: async () => {
      const state = get();

      if (state.oko_svm || state.isSolInitializing) {
        console.log("Sol SDK already initialized or initializing, skipping...");
        return state.oko_svm;
      }

      try {
        console.log("Initializing Sol SDK...");
        set({
          isSolInitializing: true,
        });

        const initRes = OkoSvmWallet.init({
          api_key:
            "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c",
          sdk_endpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
          // TODO: @dan
          chain_id: "solana:devnet",
        });

        if (initRes.success) {
          console.log("Sol SDK initialized");

          const okoSvm = initRes.data;
          setupSolListener(okoSvm);

          set({
            oko_svm: okoSvm,
            isSolInitializing: false,
          });

          try {
            await okoSvm.waitUntilInitialized;
            console.log("Sol SDK lazy initialized");
            set({
              isSolLazyInitialized: true,
            });
          } catch (e) {
            console.error("Sol SDK lazy init failed:", e);
            set({ isSolLazyInitialized: true }); // Still mark as done to not block
          }

          return okoSvm;
        } else {
          console.error("Sol sdk init fail, err: %s", initRes.err);
          set({ isSolInitializing: false, isSolLazyInitialized: true });

          return null;
        }
      } catch (e) {
        console.error("Sol SDK init error:", e);
        set({ isSolInitializing: false, isSolLazyInitialized: true });
        return null;
      }
    },
  })),
);

function setupCosmosListener(cosmosSDK: OkoCosmosWalletInterface) {
  const setUserInfo = useUserInfoState.getState().setUserInfo;

  if (cosmosSDK) {
    console.log("[Demo] Setting up Cosmos accountsChanged listener");
    cosmosSDK.on({
      type: "accountsChanged",
      handler: ({ authType, email, publicKey, name }) => {
        console.log("[Demo] accountsChanged event received:", {
          authType,
          email,
          publicKey: publicKey ? "exists" : "null",
          name,
        });
        setUserInfo({
          authType: authType || null,
          email: email || null,
          publicKey: publicKey ? Buffer.from(publicKey).toString("hex") : null,
          name: name || null,
        });
      },
    });
  }
}

function setupSolListener(solSDK: OkoSvmWalletInterface) {
  const setPublicKeyEd25519 = useUserInfoState.getState().setPublicKeyEd25519;

  console.log("[Demo] Setting up Sol accountChanged listener");
  solSDK.on("accountChanged", () => {
    const ed25519Key = solSDK.state.publicKeyRaw;
    console.log("[Demo] Sol accountChanged event received:", {
      ed25519Key: ed25519Key ? "exists" : "null",
    });
    setPublicKeyEd25519(ed25519Key);
  });
}
