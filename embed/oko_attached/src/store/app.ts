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
  resetAll: (hostOrigin: string) => void;
  resetWallet: (hostOrigin: string) => void;

  getNonce: (hostOrigin: string) => string | null;
  setNonce: (hostOrigin: string, nonce: string | null) => void;

  getCodeVerifier: (hostOrigin: string) => string | null;
  setCodeVerifier: (hostOrigin: string, codeVerifier: string | null) => void;

  getWallet: (hostOrigin: string) => WalletState | null;
  setWallet: (hostOrigin: string, wallet: WalletState | null) => void;

  getWalletEd25519: (hostOrigin: string) => Ed25519WalletState | null;
  setWalletEd25519: (
    hostOrigin: string,
    wallet: Ed25519WalletState | null,
  ) => void;

  getKeyshare_1: (hostOrigin: string) => string | null;
  setKeyshare_1: (hostOrigin: string, keyshare_1: string | null) => void;

  getKeyPackageEd25519: (hostOrigin: string) => string | null;
  setKeyPackageEd25519: (hostOrigin: string, keyPackage: string | null) => void;

  getSeedEd25519: (hostOrigin: string) => string | null;
  setSeedEd25519: (hostOrigin: string, seedEd25519: string | null) => void;

  getApiKey: (hostOrigin: string) => string | null;
  setApiKey: (hostOrigin: string, apiKey: string | null) => void;

  getAuthToken: (hostOrigin: string) => string | null;
  setAuthToken: (hostOrigin: string, jwtToken: string | null) => void;

  getTheme: (hostOrigin: string) => Theme | null;
  setTheme: (hostOrigin: string, theme: Theme | null) => void;

  getHostOriginList: () => string[];
  // getPublicKey: (hostOrigin: string) => string | undefined;
}

export const useAppState = create(
  persist(
    combine<AppState, AppActions>({ perOrigin: {} }, (set, get) => ({
      setApiKey: (hostOrigin: string, apiKey: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              apiKey,
            },
          },
        });
      },
      setNonce: (hostOrigin: string, nonce: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              nonce,
            },
          },
        });
      },
      setCodeVerifier: (hostOrigin: string, codeVerifier: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              codeVerifier,
            },
          },
        });
      },
      setKeyshare_1: (hostOrigin: string, keyshare_1: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              keyshare_1,
            },
          },
        });
      },
      setKeyPackageEd25519: (
        hostOrigin: string,
        keyPackageEd25519: string | null,
      ) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              keyPackageEd25519,
            },
          },
        });
      },
      setAuthToken: (hostOrigin: string, authToken: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              authToken,
            },
          },
        });
      },

      resetAll: (hostOrigin: string) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
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

      setWallet: (hostOrigin: string, wallet: WalletState | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              wallet,
            },
          },
        });
      },
      resetWallet: (hostOrigin: string) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              wallet: null,
            },
          },
        });
      },

      getWallet: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.wallet;
      },
      setWalletEd25519: (
        hostOrigin: string,
        ed25519Wallet: Ed25519WalletState | null,
      ) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              ed25519Wallet,
            },
          },
        });
      },
      getWalletEd25519: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.ed25519Wallet;
      },
      getNonce: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.nonce;
      },
      getCodeVerifier: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.codeVerifier;
      },
      getKeyshare_1: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.keyshare_1;
      },
      getKeyPackageEd25519: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.keyPackageEd25519;
      },
      setSeedEd25519: (hostOrigin: string, seedEd25519: string | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              seedEd25519,
            },
          },
        });
      },
      getSeedEd25519: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.seedEd25519;
      },
      getApiKey: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.apiKey;
      },
      getAuthToken: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.authToken;
      },
      getTheme: (hostOrigin: string) => {
        return get().perOrigin[hostOrigin]?.theme;
      },
      setTheme: (hostOrigin: string, theme: Theme | null) => {
        set({
          perOrigin: {
            ...get().perOrigin,
            [hostOrigin]: {
              ...get().perOrigin[hostOrigin],
              theme,
            },
          },
        });
      },
      getHostOriginList: () => {
        return Object.keys(get().perOrigin);
      },
    })),
    { name: STORAGE_KEY },
  ),
);
