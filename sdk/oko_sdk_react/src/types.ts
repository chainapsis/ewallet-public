import type {
  OkoWalletInitError,
  OkoWalletInterface,
  OkoWalletState,
  SignInType,
} from "@oko-wallet/oko-sdk-core";
import type { AuthType } from "@oko-wallet/oko-types/auth";

export interface OkoProviderConfig {
  apiKey: string;
  sdkEndpoint?: string;
  eth?: OkoEthConfig | boolean;
  cosmos?: OkoCosmosConfig | boolean;
  svm?: OkoSvmConfig | boolean;
}

export type OkoEthConfig = Record<string, never>;

export type OkoCosmosConfig = Record<string, never>;

export interface OkoSvmConfig {
  chainId: string;
}

export interface OkoCoreState {
  wallet: OkoWalletInterface | null;
  isInitialized: boolean;
  isReady: boolean;
  error: OkoInitError | null;
  authType: AuthType | null;
  email: string | null;
  publicKey: string | null;
  name: string | null;
}

export interface OkoInitError {
  type: string;
  message?: string;
}

export type OkoCoreAction =
  | { type: "INIT_SUCCESS"; wallet: OkoWalletInterface }
  | { type: "INIT_ERROR"; error: OkoInitError }
  | { type: "READY"; state: OkoWalletState }
  | {
      type: "ACCOUNTS_CHANGED";
      authType: AuthType | null;
      email: string | null;
      publicKey: string | null;
      name: string | null;
    }
  | { type: "SIGNED_OUT" };

export interface UseOkoReturn {
  wallet: OkoWalletInterface | null;
  isInitialized: boolean;
  isReady: boolean;
  error: OkoInitError | null;
}

export interface UseAuthReturn {
  isSignedIn: boolean;
  authType: AuthType | null;
  signIn: (type: SignInType) => Promise<void>;
  signOut: () => Promise<void>;
  openSignInModal: () => Promise<void>;
}

export interface UseWalletInfoReturn {
  email: string | null;
  name: string | null;
  publicKey: string | null;
  isReady: boolean;
}

export interface UseOkoModalReturn {
  openModal: OkoWalletInterface["openModal"];
  closeModal: () => void;
  openSignInModal: () => Promise<void>;
}

export type {
  AuthType,
  SignInType,
  OkoWalletInterface,
  OkoWalletState,
  OkoWalletInitError,
};
