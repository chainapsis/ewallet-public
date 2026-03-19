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
  storageKey: string;
  isMobileNative: boolean;
  apiKey: string | null;
  modalRequest: ModalRequest | null;
  error: AppError | null;
  referralInfo: ReferralInfo | null;
  resolvedTheme: "light" | "dark" | null;
}

export interface MemoryActions {
  setHostOrigin: (hostOrigin: string) => void;
  setAppName: (appName: string) => void;
  setStorageKey: (storageKey: string) => void;
  setIsMobileNative: (value: boolean) => void;
  setApiKey: (apiKey: string | null) => void;
  openModal: (req: ModalRequest) => void;
  closeModal: (payload: OpenModalAckPayload) => void;
  setError: (error: AppError) => void;
  clearError: () => void;
  setReferralInfo: (info: ReferralInfo) => void;
  clearReferralInfo: () => void;
  setResolvedTheme: (theme: "light" | "dark") => void;
}
