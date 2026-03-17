import type {
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";

import type { AppError } from "@oko-wallet-attached/errors";

export interface ModalRequest {
  port: MessagePort;
  msg: OkoWalletMsgOpenModal;
}

export interface ReferralInfo {
  origin: string;
  utmSource: string | null;
  utmCampaign: string | null;
}

export interface MemoryState {
  hostOrigin: string | null;
  appName: string;
  isMobileNative: boolean;
  modalRequest: ModalRequest | null;
  error: AppError | null;
  referralInfo: ReferralInfo | null;
}

export interface MemoryActions {
  setHostOrigin: (hostOrigin: string) => void;
  setAppName: (appName: string) => void;
  setIsMobileNative: (value: boolean) => void;
  openModal: (req: ModalRequest) => void;
  closeModal: (payload: OpenModalAckPayload) => void;
  setError: (error: AppError) => void;
  clearError: () => void;
  setReferralInfo: (info: ReferralInfo) => void;
  clearReferralInfo: () => void;
}
