import { create } from "zustand";
import { combine, persist } from "zustand/middleware";

const STORAGE_KEY = "sandbox-simple-host";

interface AppState {
  keplr_sdk_eth: null;
  keplr_sdk_cosmos: null;
  // customerId: string | null;
  // keyshare_1: string | null;
  // nonce: string | null;
  // jwtToken: string | null;
  // showModalMsg: EWalletMsgShowModalObject | null;
  // hostOrigin: string | null;
}

interface AppActions {
  initKeplrSdkEth: () => void;
  initKeplrSdkCosmos: () => void;
}

export const useAppState = create(
  persist(
    combine<AppState, AppActions>(
      {
        keplr_sdk_eth: null,
        keplr_sdk_cosmos: null,
      },
      (set) => ({
        initKeplrSdkEth: () => {},
        initKeplrSdkCosmos: () => {},
        // setCustomerId: (customerId) => set({ customerId }),
        // setNonce: (nonce) => set({ nonce }),
        // setKeyshare_1: (keyshare_1) => set({ keyshare_1 }),
        // setJwtToken: (jwtToken) => set({ jwtToken }),
        // setHostOrigin: (hostOrigin) => set({ hostOrigin }),
        // resetAll: () =>
        //   set({
        //     customerId: null,
        //     keyshare_1: null,
        //     nonce: null,
        //     jwtToken: null,
        //     hostOrigin: null,
        //   }),
        // setShowModalMsg: (showModalMsg) => {
        //   if (!showModalMsg) {
        //     set({ showModalMsg: null });
        //     return;
        //   }
        //
        //   // TODO: refactor to per function when adding types that need to show modals in the future @retto
        //   if (showModalMsg && showModalMsg.msg.msg_type === "show_modal") {
        //     set({ showModalMsg });
        //   }
        // },
      }),
    ),
    { name: STORAGE_KEY },
  ),
);
