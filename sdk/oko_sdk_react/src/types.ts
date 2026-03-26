import type {
  OkoWalletInterface,
  OkoWalletState,
  OkoWalletTheme,
  SignInType,
} from "@oko-wallet/oko-sdk-core";
import type { AuthType } from "@oko-wallet/oko-types/auth";

export interface OkoProviderConfig {
  apiKey: string;
  sdkEndpoint?: string;
  theme?: OkoWalletTheme;
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
  isReady: boolean;
  authType: AuthType | null;
  email: string | null;
  publicKey: string | null;
  name: string | null;
}

export type OkoCoreAction =
  | { type: "INIT_SUCCESS"; wallet: OkoWalletInterface }
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
  isReady: boolean;
  isSignedIn: boolean;
  authType: AuthType | null;
  email: string | null;
  name: string | null;
  publicKey: string | null;
  signIn: (type: SignInType) => Promise<void>;
  signOut: () => Promise<void>;
  openSignInModal: () => Promise<void>;
  setTheme: (theme: OkoWalletTheme) => Promise<void>;
}

export type {
  AuthType,
  SignInType,
  OkoWalletInterface,
  OkoWalletState,
  OkoWalletTheme,
};
