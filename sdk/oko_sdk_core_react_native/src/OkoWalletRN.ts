import type { Result } from "@oko-wallet/stdlib-js";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  EventEmitter3,
  type OkoWalletInterface,
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
import * as SecureStore from "expo-secure-store";
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

const WALLET_INFO_STORE_KEY = "oko_rn_wallet_info";

export interface OkoWalletRNConfig {
  apiKey: string;
  sdkEndpoint: string;
  redirectScheme?: string;
}

/**
 * React Native implementation of OkoWallet SDK.
 *
 * Architecture:
 * - Read-only ops (getPublicKey, getEmail, etc.): WebView bridge → attached iframe
 * - Login + keygen: OS browser (/mobile/login) — key shares persist in localStorage
 * - Signing: OS browser (/mobile/sign) — key shares restored from localStorage
 *
 * Key shares NEVER exist in the WebView or app JS runtime.
 */
export class OkoWalletRN implements OkoWalletInterface {
  state: OkoWalletState;
  apiKey: string;
  sdkEndpoint: string;
  redirectScheme: string;
  origin: string;
  eventEmitter: EventEmitter3<OkoWalletCoreEvent2, OkoWalletCoreEventHandler2>;

  /** Resolves when the attached iframe sends its init message */
  waitUntilInitialized: Promise<Result<OkoWalletState, string>>;

  /** @internal */
  bridge!: WebViewBridge;

  private _resolveInit!: (value: Result<OkoWalletState, string>) => void;
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

  /** @internal Handle events from the bridge (init) */
  private _handleBridgeEvent(eventType: string, payload: unknown): void {
    if (eventType === "init") {
      this._handleInit(payload);
      return;
    }
  }

  private async _handleInit(payload: unknown): Promise<void> {
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
    }

    // WebView's attached has separate localStorage from OS browser,
    // so it won't have login state. Restore from persisted storage.
    if (!this.state.publicKey) {
      await this._restoreWalletInfo();
    }

    if (this.state.email && this.state.publicKey) {
      this.eventEmitter.emit({
        type: "CORE__accountsChanged",
        authType: this.state.authType,
        publicKey: this.state.publicKey,
        email: this.state.email,
        name: this.state.name,
      });
    }

    this._resolveInit({ success: true, data: this.state });
  }

  // ─── OkoWalletInterface compatible methods ───

  /**
   * Send a message to the attached iframe via WebView bridge.
   * Used for read-only operations only (getPublicKey, getEmail, etc.)
   */
  async sendMsgToIframe(msg: OkoWalletMsg): Promise<OkoWalletMsg> {
    await this.waitUntilInitialized;
    return this.bridge.sendMessage(msg);
  }

  /**
   * Open a signing modal via OS browser.
   * Key shares are restored from attached's localStorage automatically.
   */
  async openModal(
    msg: OkoWalletMsgOpenModal,
  ): Promise<Result<OpenModalAckPayload, OpenModalError>> {
    await this.waitUntilInitialized;

    return openModalRN(this.sdkEndpoint, msg, this.redirectScheme, this.apiKey);
  }

  /**
   * Sign in via OS browser. The entire login + keygen flow runs
   * in the system browser. Key shares persist in attached's localStorage,
   * never entering the WebView or app JS runtime.
   */
  async signIn(type: SignInType): Promise<void> {
    await this.waitUntilInitialized;

    const signInOptions: SignInOptions = {
      redirectScheme: this.redirectScheme,
    };

    const result = await signInRN(
      this.sdkEndpoint,
      type,
      this.apiKey,
      signInOptions,
    );

    // Update state from the public wallet info returned via relay
    const info = result.walletInfo as WalletInfo | null;
    if (info) {
      this.state = {
        authType: info.authType,
        publicKey: info.publicKey,
        email: info.email,
        name: info.name,
      };

      await this._persistWalletInfo();

      this.eventEmitter.emit({
        type: "CORE__accountsChanged",
        authType: info.authType,
        publicKey: info.publicKey,
        email: info.email,
        name: info.name,
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
    await this._clearPersistedWalletInfo();

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
    // No-op in OS browser architecture — modal is in the OS browser
  }

  async openSignInModal(): Promise<void> {
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

  // ─── Wallet info persistence (public data only) ───

  private async _persistWalletInfo(): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        WALLET_INFO_STORE_KEY,
        JSON.stringify(this.state),
      );
    } catch {
      // Non-critical — app will require re-login on next launch
    }
  }

  private async _restoreWalletInfo(): Promise<void> {
    try {
      const raw = await SecureStore.getItemAsync(WALLET_INFO_STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as OkoWalletState;
      if (parsed.publicKey) {
        this.state = parsed;
      }
    } catch {
      // Corrupted or missing — ignore
    }
  }

  private async _clearPersistedWalletInfo(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(WALLET_INFO_STORE_KEY);
    } catch {
      // Non-critical
    }
  }
}
