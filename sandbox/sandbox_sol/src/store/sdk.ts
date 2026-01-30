import { create } from "zustand";
import type { OkoWalletInterface } from "@oko-wallet/oko-sdk-core";
import type { OkoSvmWalletInterface } from "@oko-wallet/oko-sdk-svm";

interface SdkState {
  okoWallet: OkoWalletInterface | null;
  okoSvmWallet: OkoSvmWalletInterface | null;
  isInitialized: boolean;
  isConnected: boolean;
  publicKey: string | null;
  setOkoWallet: (wallet: OkoWalletInterface) => void;
  setOkoSvmWallet: (wallet: OkoSvmWalletInterface) => void;
  setInitialized: (initialized: boolean) => void;
  setConnected: (connected: boolean, publicKey: string | null) => void;
}

export const useSdkStore = create<SdkState>((set) => ({
  okoWallet: null,
  okoSvmWallet: null,
  isInitialized: false,
  isConnected: false,
  publicKey: null,
  setOkoWallet: (wallet) => set({ okoWallet: wallet }),
  setOkoSvmWallet: (wallet) => set({ okoSvmWallet: wallet }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setConnected: (connected, publicKey) =>
    set({ isConnected: connected, publicKey }),
}));
