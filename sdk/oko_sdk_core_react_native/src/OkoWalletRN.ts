import type { OpenModalError, SignInType } from "@oko-wallet/oko-sdk-core";
import {
  EventEmitter3,
  type OkoWalletCoreEvent2,
  type OkoWalletCoreEventHandler2,
  type OkoWalletInterface,
  type OkoWalletMsg,
  type OkoWalletMsgOpenModal,
  type OkoWalletState,
  type OkoWalletTheme,
  type OpenModalAckPayload,
  type WalletInfo,
} from "@oko-wallet/oko-sdk-core";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getCosmosChainInfo, getEthChainInfo } from "./chain_info";
import { callRpc } from "./methods/call_rpc";
import type { LoginWalletInfo } from "./methods/login_url_codec";
import { openModalRN } from "./methods/open_modal";
import { type SignInOptions, signInRN } from "./methods/sign_in";
import { signOutRN } from "./methods/sign_out";

const WALLET_INFO_STORE_KEY = "oko_rn_wallet_info";
const CLIENT_RANDOM_STORE_KEY = "oko_rn_client_random";
const BROWSER_SESSION_MISSING_ERROR_TYPES = new Set([
  "api_key_not_found",
  "key_share_not_combined",
  "wallet_not_found",
  "jwt_not_found",
]);

interface PersistedWalletInfo extends OkoWalletState {
  publicKeyEd25519?: string | null;
  sdkEndpoint?: string;
}

const DEFAULT_SDK_ENDPOINT = "https://mobile.oko.app";

export interface OkoWalletRNConfig {
  apiKey: string;
  sdkEndpoint?: string;
  redirectScheme?: string;
  /** Android-only callback scheme for OkoAuthCallbackActivity (default: "oko.auth.callback").
   *  Must match `callbackScheme` in the Expo config plugin (or your AndroidManifest intent-filter). */
  androidCallbackScheme?: string;
}

export class OkoWalletRN implements OkoWalletInterface {
  state: OkoWalletState;
  apiKey: string;
  sdkEndpoint: string;
  redirectScheme: string;
  androidCallbackScheme: string | undefined;
  origin: string;
  eventEmitter: EventEmitter3<OkoWalletCoreEvent2, OkoWalletCoreEventHandler2>;

  waitUntilInitialized: Promise<Result<OkoWalletState, string>>;

  private _resolveInit!: (value: Result<OkoWalletState, string>) => void;
  private _initResolved = false;
  private _cachedPublicKeyEd25519: string | null = null;
  private _clientRandom: string | null = null;

  constructor(config: OkoWalletRNConfig) {
    this.apiKey = config.apiKey;
    this.sdkEndpoint = config.sdkEndpoint ?? DEFAULT_SDK_ENDPOINT;
    this.redirectScheme = config.redirectScheme ?? "okowallet";
    this.androidCallbackScheme = config.androidCallbackScheme;
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

    this._initialize();
  }

  private async _initialize(): Promise<void> {
    if (this._initResolved) {
      return;
    }
    this._initResolved = true;

    try {
      this._clientRandom = await this._getOrCreateClientRandom();
      await this._restoreWalletInfo();

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
    } catch (e) {
      console.error("[oko-rn] initialization failed:", e);
      this._resolveInit({
        success: false,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async sendMsgToIframe(msg: OkoWalletMsg): Promise<OkoWalletMsg> {
    // Chain info queries are handled locally (no iframe needed)
    if (msg.msg_type === "get_eth_chain_info") {
      try {
        const chains = await getEthChainInfo(msg.payload.chain_id);
        return {
          target: "oko_sdk",
          msg_type: "get_eth_chain_info_ack",
          payload: { success: true as const, data: chains },
        } as OkoWalletMsg;
      } catch (error) {
        return {
          target: "oko_sdk",
          msg_type: "get_eth_chain_info_ack",
          payload: {
            success: false as const,
            err: error instanceof Error ? error.message : "Unknown error",
          },
        } as OkoWalletMsg;
      }
    }

    if (msg.msg_type === "get_cosmos_chain_info") {
      try {
        const chains = await getCosmosChainInfo(msg.payload.chain_id);
        return {
          target: "oko_sdk",
          msg_type: "get_cosmos_chain_info_ack",
          payload: { success: true as const, data: chains },
        } as OkoWalletMsg;
      } catch (error) {
        return {
          target: "oko_sdk",
          msg_type: "get_cosmos_chain_info_ack",
          payload: {
            success: false as const,
            err: error instanceof Error ? error.message : "Unknown error",
          },
        } as OkoWalletMsg;
      }
    }

    // All other messages are forwarded via generic RPC
    const result = await callRpc(
      this.sdkEndpoint,
      msg.msg_type,
      msg.payload,
      this.apiKey,
      this.redirectScheme,
      this.state.publicKey,
      this._clientRandom,
      this.androidCallbackScheme,
    );

    return {
      target: "oko_sdk",
      msg_type: `${msg.msg_type}_ack`,
      payload: result,
    } as OkoWalletMsg;
  }

  async openModal(
    msg: OkoWalletMsgOpenModal,
  ): Promise<Result<OpenModalAckPayload, OpenModalError>> {
    await this.waitUntilInitialized;

    const result = await openModalRN(
      this.sdkEndpoint,
      msg,
      this.redirectScheme,
      this.apiKey,
      this.state.publicKey,
      this._clientRandom,
      this.androidCallbackScheme,
    );

    if (
      result.success &&
      result.data.type === "error" &&
      BROWSER_SESSION_MISSING_ERROR_TYPES.has(result.data.error.type)
    ) {
      await this._resetPersistedSession(
        `[oko-rn] clearing cached wallet info after browser session error: ${result.data.error.type}`,
      );
    }

    return result;
  }

  async signIn(type: SignInType): Promise<void> {
    await this.waitUntilInitialized;

    const signInOptions: SignInOptions = {
      redirectScheme: this.redirectScheme,
      androidCallbackScheme: this.androidCallbackScheme,
    };

    const result = await signInRN(
      this.sdkEndpoint,
      type,
      this.apiKey,
      signInOptions,
      this._clientRandom,
    );

    const info: LoginWalletInfo | null = result.walletInfo;
    if (info) {
      this.state = {
        authType: info.authType,
        publicKey: info.publicKey,
        email: info.email,
        name: info.name,
      };
      this._cachedPublicKeyEd25519 = info.publicKeyEd25519 ?? null;

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

    try {
      await signOutRN(
        this.sdkEndpoint,
        this.redirectScheme,
        this.androidCallbackScheme,
        this._clientRandom,
      );
    } catch (error) {
      console.warn("[oko-rn] OS-browser sign-out failed:", error);
    }

    await this._resetPersistedSession();
  }

  async getPublicKey(): Promise<string | null> {
    await this.waitUntilInitialized;
    return this.state.publicKey;
  }

  async getPublicKeyEd25519(): Promise<string | null> {
    await this.waitUntilInitialized;
    return this._cachedPublicKeyEd25519;
  }

  async getEmail(): Promise<string | null> {
    await this.waitUntilInitialized;
    return this.state.email;
  }

  async getName(): Promise<string | null> {
    await this.waitUntilInitialized;
    return this.state.name;
  }

  async getWalletInfo(): Promise<WalletInfo | null> {
    await this.waitUntilInitialized;
    if (!this.state.publicKey || !this.state.authType) {
      return null;
    }
    return {
      authType: this.state.authType,
      publicKey: this.state.publicKey,
      email: this.state.email,
      name: this.state.name,
    };
  }

  async getAuthType(): Promise<AuthType | null> {
    await this.waitUntilInitialized;
    return this.state.authType;
  }

  async setTheme(_theme: OkoWalletTheme): Promise<void> {}

  closeModal(): void {}

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

  private async _getOrCreateClientRandom(): Promise<string> {
    const stored = await AsyncStorage.getItem(CLIENT_RANDOM_STORE_KEY);
    if (stored) {
      return stored;
    }
    const random = generateUUIDv4();
    await AsyncStorage.setItem(CLIENT_RANDOM_STORE_KEY, random);
    return random;
  }

  private async _persistWalletInfo(): Promise<void> {
    try {
      const data: PersistedWalletInfo = {
        ...this.state,
        publicKeyEd25519: this._cachedPublicKeyEd25519,
        sdkEndpoint: this.sdkEndpoint,
      };
      await AsyncStorage.setItem(WALLET_INFO_STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("[oko-rn] failed to persist wallet info:", e);
    }
  }

  private async _restoreWalletInfo(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(WALLET_INFO_STORE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as PersistedWalletInfo;
      if (parsed.sdkEndpoint && parsed.sdkEndpoint !== this.sdkEndpoint) {
        await this._clearPersistedWalletInfo();
        return;
      }
      if (parsed.publicKey) {
        this.state = {
          authType: parsed.authType,
          email: parsed.email,
          publicKey: parsed.publicKey,
          name: parsed.name,
        };
        this._cachedPublicKeyEd25519 = parsed.publicKeyEd25519 ?? null;
      }
    } catch (e) {
      console.warn("[oko-rn] failed to restore wallet info:", e);
    }
  }

  private async _clearPersistedWalletInfo(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WALLET_INFO_STORE_KEY);
    } catch (e) {
      console.warn("[oko-rn] failed to clear persisted wallet info:", e);
    }
  }

  private async _resetPersistedSession(logMessage?: string): Promise<void> {
    if (logMessage) {
      console.warn(logMessage);
    }

    const hadState =
      this.state.authType !== null ||
      this.state.email !== null ||
      this.state.publicKey !== null ||
      this.state.name !== null ||
      this._cachedPublicKeyEd25519 !== null;

    this.state = {
      authType: null,
      email: null,
      publicKey: null,
      name: null,
    };
    this._cachedPublicKeyEd25519 = null;
    await this._clearPersistedWalletInfo();

    if (!hadState) {
      return;
    }

    this.eventEmitter.emit({
      type: "CORE__accountsChanged",
      authType: null,
      publicKey: null,
      email: null,
      name: null,
    });
  }
}

function generateUUIDv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version (4) and variant (RFC 4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
