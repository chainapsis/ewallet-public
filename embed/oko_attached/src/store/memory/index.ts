import type {
  OkoWalletMsgOpenModalAck,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import { create } from "zustand";
import { combine } from "zustand/middleware";

import type { MemoryActions, MemoryState, ReferralInfo } from "./types";
import type { AppError } from "@oko-wallet-attached/errors";
import { OKO_SDK_TARGET } from "@oko-wallet-attached/window_msgs/target";

const initialState: MemoryState = {
  hostOrigin: null,
  modalRequest: null,
  error: null,
  referralInfo: null,
};

export const useMemoryState = create(
  combine<MemoryState, MemoryActions>(initialState, (set, get) => ({
    setHostOrigin: (hostOrigin: string) => {
      set({ hostOrigin });
    },
    openModal: ({ port, msg }) => {
      if (msg.msg_type !== "open_modal") {
        return;
      }

      set((_prev) => {
        return {
          modalRequest: {
            port,
            msg,
          },
        };
      });
    },
    closeModal: (payload: OpenModalAckPayload) => {
      const modalRequest = get().modalRequest;
      if (modalRequest) {
        const { port } = modalRequest;

        const ack: OkoWalletMsgOpenModalAck = {
          target: OKO_SDK_TARGET,
          msg_type: "open_modal_ack",
          payload,
        };

        port.postMessage(ack);

        set({ modalRequest: null });
      }
    },
    setError: (error: AppError) => {
      set({ error });
    },
    clearError: () => {
      set({ error: null });
    },
    setReferralInfo: (info: ReferralInfo) => {
      set({ referralInfo: info });
    },
    clearReferralInfo: () => {
      set({ referralInfo: null });
    },
  })),
);
