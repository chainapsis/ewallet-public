import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { create } from "zustand";
import { combine, persist } from "zustand/middleware";

const STORAGE_KEY = "oko-wallet-app-2";

interface WalletState {
  authType: AuthType;
  walletId: string;
  publicKey: string;
  email: string | null;
  name: string | null;
}

interface Ed25519WalletState {
  authType: AuthType;
  walletId: string;
  /** hex-encoded PublicKeyPackageRaw JSON */
  publicKeyPackage: string;
  publicKey: string;
  email: string | null;
  name: string | null;
}

interface PerOriginState {
  theme: Theme | null;
  apiKey: string | null;
  keyshare_1: string | null;
  /** hex-encoded KeyPackageRaw JSON (contains signing_share for ed25519) */
  keyPackageEd25519: string | null;
  /** JSON-encoded number[] — combined ed25519 user seed share */
  seedEd25519: string | null;
  nonce: string | null;
  codeVerifier: string | null;
  authToken: string | null;
  wallet: WalletState | null;
  ed25519Wallet: Ed25519WalletState | null;
}

interface AppState {
  perOrigin: { [origin: string]: PerOriginState };
}

interface AppActions {
  resetAll: (storageKey: string) => void;
  getNonce: (storageKey: string) => string | null;
  setNonce: (storageKey: string, nonce: string | null) => void;

  getCodeVerifier: (storageKey: string) => string | null;
  setCodeVerifier: (storageKey: string, codeVerifier: string | null) => void;

  getWallet: (storageKey: string) => WalletState | null;
  setWallet: (storageKey: string, wallet: WalletState | null) => void;

  getWalletEd25519: (storageKey: string) => Ed25519WalletState | null;
  setWalletEd25519: (
    storageKey: string,
    wallet: Ed25519WalletState | null,
  ) => void;

  getKeyshare_1: (storageKey: string) => string | null;
  setKeyshare_1: (storageKey: string, keyshare_1: string | null) => void;

  getKeyPackageEd25519: (storageKey: string) => string | null;
  setKeyPackageEd25519: (storageKey: string, keyPackage: string | null) => void;

  getSeedEd25519: (storageKey: string) => string | null;
  setSeedEd25519: (storageKey: string, seedEd25519: string | null) => void;

  getApiKey: (storageKey: string) => string | null;
  setApiKey: (storageKey: string, apiKey: string | null) => void;

  getAuthToken: (storageKey: string) => string | null;
  setAuthToken: (storageKey: string, jwtToken: string | null) => void;

  getTheme: (storageKey: string) => Theme | null;
  setTheme: (storageKey: string, theme: Theme | null) => void;

  getStorageKeyList: () => string[];
  // getPublicKey: (storageKey: string) => string | undefined;
}

export const useAppState = create(
  persist(
    combine<AppState, AppActions>({ perOrigin: {} }, (set, get) => ({
      setApiKey: (storageKey: string, apiKey: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              apiKey,
            },
          },
        });
      },
      setNonce: (storageKey: string, nonce: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              nonce,
            },
          },
        });
      },
      setCodeVerifier: (storageKey: string, codeVerifier: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              codeVerifier,
            },
          },
        });
      },
      setKeyshare_1: (storageKey: string, keyshare_1: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              keyshare_1,
            },
          },
        });
      },
      setKeyPackageEd25519: (
        storageKey: string,
        keyPackageEd25519: string | null,
      ) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              keyPackageEd25519,
            },
          },
        });
      },
      setAuthToken: (storageKey: string, authToken: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              authToken,
            },
          },
        });
      },

      resetAll: (storageKey: string) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              theme: null,
              apiKey: null,
              keyshare_1: null,
              keyPackageEd25519: null,
              seedEd25519: null,
              nonce: null,
              codeVerifier: null,
              authToken: null,
              wallet: null,
              ed25519Wallet: null,
            },
          },
        });
      },

      setWallet: (storageKey: string, wallet: WalletState | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              wallet,
            },
          },
        });
      },
      getWallet: (storageKey: string) => {
        return get().perOrigin[storageKey]?.wallet;
      },
      setWalletEd25519: (
        storageKey: string,
        ed25519Wallet: Ed25519WalletState | null,
      ) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              ed25519Wallet,
            },
          },
        });
      },
      getWalletEd25519: (storageKey: string) => {
        return get().perOrigin[storageKey]?.ed25519Wallet;
      },
      getNonce: (storageKey: string) => {
        return get().perOrigin[storageKey]?.nonce;
      },
      getCodeVerifier: (storageKey: string) => {
        return get().perOrigin[storageKey]?.codeVerifier;
      },
      getKeyshare_1: (storageKey: string) => {
        return get().perOrigin[storageKey]?.keyshare_1;
      },
      getKeyPackageEd25519: (storageKey: string) => {
        return get().perOrigin[storageKey]?.keyPackageEd25519;
      },
      setSeedEd25519: (storageKey: string, seedEd25519: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              seedEd25519,
            },
          },
        });
      },
      getSeedEd25519: (storageKey: string) => {
        return get().perOrigin[storageKey]?.seedEd25519;
      },
      getApiKey: (storageKey: string) => {
        return get().perOrigin[storageKey]?.apiKey;
      },
      getAuthToken: (storageKey: string) => {
        return get().perOrigin[storageKey]?.authToken;
      },
      getTheme: (storageKey: string) => {
        return get().perOrigin[storageKey]?.theme;
      },
      setTheme: (storageKey: string, theme: Theme | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [storageKey]: {
              ...get().perOrigin[storageKey],
              theme,
            },
          },
        });
      },
      getStorageKeyList: () => {
        return Object.keys(get().perOrigin);
      },
    })),
    { name: STORAGE_KEY },
  ),
);
