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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { openModalRN } from "./methods/open_modal";
import { signInRN, type SignInOptions } from "./methods/sign_in";
import type { LoginWalletInfo } from "./methods/login_url_codec";
import { getEthChainInfo, getCosmosChainInfo } from "./chain_info";
import { callRpc } from "./methods/call_rpc";

const WALLET_INFO_STORE_KEY = "oko_rn_wallet_info";

interface PersistedWalletInfo extends OkoWalletState {
  publicKeyEd25519?: string | null;
}

const DEFAULT_SDK_ENDPOINT = "https://proxy.oko.app";

export interface OkoWalletRNConfig {
  apiKey: string;
  sdkEndpoint?: string;
  redirectScheme?: string;
}

export class OkoWalletRN implements OkoWalletInterface {
  state: OkoWalletState;
  apiKey: string;
  sdkEndpoint: string;
  redirectScheme: string;
  origin: string;
  eventEmitter: EventEmitter3<OkoWalletCoreEvent2, OkoWalletCoreEventHandler2>;

  waitUntilInitialized: Promise<Result<OkoWalletState, string>>;

  private _resolveInit!: (value: Result<OkoWalletState, string>) => void;
  private _initResolved = false;
  private _cachedPublicKeyEd25519: string | null = null;

  constructor(config: OkoWalletRNConfig) {
    this.apiKey = config.apiKey;
    this.sdkEndpoint = config.sdkEndpoint ?? DEFAULT_SDK_ENDPOINT;
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

    this._initialize();
  }

  private async _initialize(): Promise<void> {
    if (this._initResolved) return;
    this._initResolved = true;

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

    return openModalRN(this.sdkEndpoint, msg, this.redirectScheme, this.apiKey);
  }

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
    if (!this.state.publicKey || !this.state.authType) return null;
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

  private async _persistWalletInfo(): Promise<void> {
    try {
      const data: PersistedWalletInfo = {
        ...this.state,
        publicKeyEd25519: this._cachedPublicKeyEd25519,
      };
      await AsyncStorage.setItem(WALLET_INFO_STORE_KEY, JSON.stringify(data));
    } catch {}
  }

  private async _restoreWalletInfo(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(WALLET_INFO_STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedWalletInfo;
      if (parsed.publicKey) {
        this.state = {
          authType: parsed.authType,
          email: parsed.email,
          publicKey: parsed.publicKey,
          name: parsed.name,
        };
        this._cachedPublicKeyEd25519 = parsed.publicKeyEd25519 ?? null;
      }
    } catch {}
  }

  private async _clearPersistedWalletInfo(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WALLET_INFO_STORE_KEY);
    } catch {}
  }
}
