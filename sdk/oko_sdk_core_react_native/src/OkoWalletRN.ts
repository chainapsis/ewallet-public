import type { Result } from "@oko-wallet/stdlib-js";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  EventEmitter3,
  type OkoWalletMsg,
  type OkoWalletMsgOpenModal,
  type OkoWalletState,
  type WalletInfo,
  type OkoWalletCoreEvent2,
  type OkoWalletCoreEventHandler2,
  type OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { OpenModalError } from "@oko-wallet/oko-sdk-core";
import type { SignInType } from "@oko-wallet/oko-sdk-core";

import type { WebViewBridge } from "./bridge/WebViewBridge";
import {
  getPublicKey,
  getPublicKeyEd25519,
  getEmail,
  getName,
  getWalletInfo,
  getAuthType,
} from "./methods/getters";
import { openModalRN } from "./methods/open_modal";
import { signInRN, type SignInOptions } from "./methods/sign_in";
import { signOutRN } from "./methods/sign_out";

export interface OkoWalletRNConfig {
  apiKey: string;
  sdkEndpoint: string;
  redirectScheme?: string;
}

/**
 * React Native implementation of OkoWallet SDK.
 *
 * Replaces oko_sdk_core's browser-based iframe transport with
 * a WebView bridge that forwards messages to the attached iframe
 * hosted on the proxy bridge page.
 *
 * Chain SDKs (cosmos, eth, svm) can use this via `sendMsgToIframe()`
 * which routes through the WebView bridge internally.
 */
export class OkoWalletRN {
  state: OkoWalletState;
  apiKey: string;
  sdkEndpoint: string;
  redirectScheme: string;
  origin: string;
  eventEmitter: EventEmitter3<
    OkoWalletCoreEvent2,
    OkoWalletCoreEventHandler2
  >;

  // Stubs for OkoWalletInterface compat (unused in RN)
  iframe: null = null;
  activePopupId: string | null = null;
  activePopupWindow: null = null;

  /** Resolves when the attached iframe sends its init message */
  waitUntilInitialized: Promise<Result<OkoWalletState, string>>;

  /** @internal */
  bridge!: WebViewBridge;

  /** @internal Callbacks set by OkoWalletProvider */
  _showModal: (() => void) | null = null;
  _hideModal: (() => void) | null = null;

  private _resolveInit!: (
    value: Result<OkoWalletState, string>,
  ) => void;
  private _initResolved = false;
  private _cachedPublicKeyEd25519: string | null = null;

  constructor(config: OkoWalletRNConfig) {
    this.apiKey = config.apiKey;
    this.sdkEndpoint = config.sdkEndpoint;
    this.redirectScheme = config.redirectScheme ?? "okowallet";
    this.origin = `${this.redirectScheme}://`;
    this.state = {
      authType: null,
      email: null,
      publicKey: null,
      name: null,
    };
    this.eventEmitter = new EventEmitter3<
      OkoWalletCoreEvent2,
      OkoWalletCoreEventHandler2
    >();

    this.waitUntilInitialized = new Promise((resolve) => {
      this._resolveInit = resolve;
    });
  }

  /** @internal Called by OkoWalletProvider when WebView bridge is ready */
  _setBridge(bridge: WebViewBridge): void {
    this.bridge = bridge;

    bridge.onEvent = (eventType: string, payload: unknown) => {
      this._handleBridgeEvent(eventType, payload);
    };
  }

  /** @internal Handle events from the bridge (init, oauth_sign_in_update) */
  private _handleBridgeEvent(eventType: string, payload: unknown): void {
    if (eventType === "init") {
      this._handleInit(payload);
      return;
    }

    if (eventType === "oauth_sign_in_update") {
      // State update will be handled by signIn method via getWalletInfo
      return;
    }
  }

  private _handleInit(payload: unknown): void {
    if (this._initResolved) return;
    this._initResolved = true;

    const data = payload as {
      success: boolean;
      data?: {
        auth_type: AuthType | null;
        email: string | null;
        public_key: string | null;
        name: string | null;
      };
      err?: string;
    };

    if (data.success && data.data) {
      this.state = {
        authType: data.data.auth_type,
        email: data.data.email,
        publicKey: data.data.public_key,
        name: data.data.name,
      };

      if (data.data.email && data.data.public_key) {
        this.eventEmitter.emit({
          type: "CORE__accountsChanged",
          authType: data.data.auth_type,
          publicKey: data.data.public_key,
          email: data.data.email,
          name: data.data.name,
        });
      }

      this._resolveInit({ success: true, data: this.state });
    } else {
      this._resolveInit({
        success: false,
        err: data.err ?? "init failed",
      });
    }
  }

  // ─── OkoWalletInterface compatible methods ───

  /**
   * Send a message to the attached iframe via WebView bridge.
   * Chain SDKs call this for operations like get_cosmos_chain_info, open_modal, etc.
   */
  async sendMsgToIframe(msg: OkoWalletMsg): Promise<OkoWalletMsg> {
    await this.waitUntilInitialized;
    return this.bridge.sendMessage(msg);
  }

  async openModal(
    msg: OkoWalletMsgOpenModal,
  ): Promise<Result<OpenModalAckPayload, OpenModalError>> {
    await this.waitUntilInitialized;

    return openModalRN(
      this.bridge,
      msg,
      () => this._showModal?.(),
      () => this._hideModal?.(),
    );
  }

  async signIn(type: SignInType): Promise<void> {
    await this.waitUntilInitialized;

    const signInOptions: SignInOptions = {
      redirectScheme: this.redirectScheme,
    };

    await signInRN(this.bridge, type, this.apiKey, signInOptions);

    // Refresh state from attached after sign-in
    const walletInfo = await this.getWalletInfo();
    if (walletInfo) {
      this.state = {
        authType: walletInfo.authType,
        publicKey: walletInfo.publicKey,
        email: walletInfo.email,
        name: walletInfo.name,
      };

      this.eventEmitter.emit({
        type: "CORE__accountsChanged",
        authType: walletInfo.authType,
        publicKey: walletInfo.publicKey,
        email: walletInfo.email,
        name: walletInfo.name,
      });
    }
  }

  async signOut(): Promise<void> {
    await this.waitUntilInitialized;
    await signOutRN(this.bridge);

    this.state = {
      authType: null,
      email: null,
      publicKey: null,
      name: null,
    };
    this._cachedPublicKeyEd25519 = null;

    this.eventEmitter.emit({
      type: "CORE__accountsChanged",
      authType: null,
      publicKey: null,
      email: null,
      name: null,
    });
  }

  async getPublicKey(): Promise<string | null> {
    await this.waitUntilInitialized;
    const result = await getPublicKey(this.bridge, this.state.publicKey);
    if (result && !this.state.publicKey) {
      this.state.publicKey = result;
    }
    return result;
  }

  async getPublicKeyEd25519(): Promise<string | null> {
    await this.waitUntilInitialized;
    const result = await getPublicKeyEd25519(
      this.bridge,
      this._cachedPublicKeyEd25519,
    );
    if (result) {
      this._cachedPublicKeyEd25519 = result;
    }
    return result;
  }

  async getEmail(): Promise<string | null> {
    await this.waitUntilInitialized;
    const result = await getEmail(this.bridge, this.state.email);
    if (result && !this.state.email) {
      this.state.email = result;
    }
    return result;
  }

  async getName(): Promise<string | null> {
    await this.waitUntilInitialized;
    const result = await getName(this.bridge, this.state.name);
    if (result && !this.state.name) {
      this.state.name = result;
    }
    return result;
  }

  async getWalletInfo(): Promise<WalletInfo | null> {
    await this.waitUntilInitialized;
    return getWalletInfo(this.bridge);
  }

  async getAuthType(): Promise<AuthType | null> {
    await this.waitUntilInitialized;
    const result = await getAuthType(this.bridge, this.state.authType);
    if (result && !this.state.authType) {
      this.state.authType = result;
    }
    return result;
  }

  closeModal(): void {
    this._hideModal?.();
  }

  async openSignInModal(): Promise<void> {
    // In RN, there's no built-in sign-in modal.
    // The host app should build its own provider selection UI
    // and call signIn(type) directly.
    throw new Error(
      "[oko-rn] openSignInModal is not supported in React Native. " +
        "Build your own provider selection UI and call signIn(type) directly.",
    );
  }

  async startEmailSignIn(_email: string): Promise<void> {
    throw new Error(
      "[oko-rn] Email sign-in is not yet supported in React Native.",
    );
  }

  async completeEmailSignIn(_email: string, _code: string): Promise<void> {
    throw new Error(
      "[oko-rn] Email sign-in is not yet supported in React Native.",
    );
  }

  on(handlerDef: OkoWalletCoreEventHandler2): void {
    this.eventEmitter.on(handlerDef);
  }

  off(handlerDef: OkoWalletCoreEventHandler2): void {
    this.eventEmitter.off(handlerDef);
  }
}
