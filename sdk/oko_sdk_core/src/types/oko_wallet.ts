import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";

import type { OkoWalletCoreEvent2, OkoWalletCoreEventHandler2 } from "./event";
import type { OpenModalAckPayload } from "./modal";
import type { OkoWalletMsg, OkoWalletMsgOpenModal, WalletInfo } from "./msg";
import type { SignInType } from "./oauth";
import type {
  OkoWalletInitError,
  OpenModalError,
} from "@oko-wallet-sdk-core/errors";
import type { EventEmitter3 } from "@oko-wallet-sdk-core/event";

export type { WalletInfo };

export type OkoWalletTheme = "light" | "dark";

export interface OkoWalletStaticInterface {
  new (
    apiKey: string,
    iframe: HTMLIFrameElement,
    sdkEndpoint: string,
  ): OkoWalletWebInterface;
  version: string;
  init: (
    args: OkoWalletInitArgs,
  ) => Result<OkoWalletInterface, OkoWalletInitError>;
}

/**
 * Wallet interface consumed by chain SDKs (eth, cosmos, svm).
 * Platform-specific implementations (web, mobile) implement this.
 */
export interface OkoWalletInterface {
  origin: string;
  state: OkoWalletState;
  apiKey: string;
  sdkEndpoint: string;
  eventEmitter: EventEmitter3<OkoWalletCoreEvent2, OkoWalletCoreEventHandler2>;
  waitUntilInitialized: Promise<Result<OkoWalletState, string>>;

  openModal: (
    msg: OkoWalletMsgOpenModal,
  ) => Promise<Result<OpenModalAckPayload, OpenModalError>>;
  openSignInModal: () => Promise<void>;
  closeModal: () => void;
  sendMsgToIframe: (msg: OkoWalletMsg) => Promise<OkoWalletMsg>;
  signIn: (type: SignInType) => Promise<void>;
  signOut: () => Promise<void>;
  getPublicKey: () => Promise<string | null>;
  getPublicKeyEd25519: () => Promise<string | null>;
  getEmail: () => Promise<string | null>;
  getName: () => Promise<string | null>;
  getWalletInfo: () => Promise<WalletInfo | null>;
  getAuthType: () => Promise<AuthType | null>;
  setTheme: (theme: OkoWalletTheme) => Promise<void>;
  startEmailSignIn: (email: string) => Promise<void>;
  completeEmailSignIn: (email: string, code: string) => Promise<void>;
  on: (handlerDef: OkoWalletCoreEventHandler2) => void;
  off: (handlerDef: OkoWalletCoreEventHandler2) => void;
}

/**
 * Web-specific wallet interface used internally by oko_sdk_core.
 * Extends OkoWalletInterface with browser-only fields.
 */
export interface OkoWalletWebInterface extends OkoWalletInterface {
  iframe: HTMLIFrameElement;
  activePopupId: string | null;
  activePopupWindow: Window | null;
  _theme: OkoWalletTheme | null;
}

export interface OkoWalletInitArgs {
  api_key: string;
  sdk_endpoint?: string;
  theme?: OkoWalletTheme;
}

export interface OkoWalletState {
  authType: AuthType | null;
  email: string | null;
  publicKey: string | null;
  name: string | null;
}
