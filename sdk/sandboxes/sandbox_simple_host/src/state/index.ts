import {
  CosmosEWallet,
  initCosmosEWallet,
} from "@keplr-ewallet/ewallet-sdk-cosmos";
import { EthEWallet, initEthEWallet } from "@keplr-ewallet/ewallet-sdk-eth";
import { create } from "zustand";
import { combine, persist } from "zustand/middleware";

const STORAGE_KEY = "sandbox-simple-host";

interface AppState {
  keplr_sdk_eth: EthEWallet | null;
  keplr_sdk_cosmos: CosmosEWallet | null;
}

interface AppActions {
  initKeplrSdkEth: () => Promise<boolean>;
  initKeplrSdkCosmos: () => Promise<boolean>;
}

export const useAppState = create(
  persist(
    combine<AppState, AppActions>(
      {
        keplr_sdk_eth: null,
        keplr_sdk_cosmos: null,
      },
      (set) => ({
        initKeplrSdkEth: async () => {
          const sdk = await initEthEWallet({
            customerId: "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
          });

          if (sdk) {
            set({ keplr_sdk_eth: sdk });
            return true;
          } else {
            console.error("sdk init fail");
            return false;
          }
        },
        initKeplrSdkCosmos: async () => {
          const sdk = await initCosmosEWallet({
            customerId: "afb0afd1-d66d-4531-981c-cbf3fb1507b9", // from seed data
          });

          if (sdk) {
            set({ keplr_sdk_cosmos: sdk });
            return true;
          } else {
            console.error("sdk init fail");
            return false;
          }
        },
      }),
    ),
    { name: STORAGE_KEY },
  ),
);
