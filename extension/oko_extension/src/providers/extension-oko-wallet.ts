/**
 * Extension-specific implementation of OkoWalletInterface
 *
 * This replaces iframe communication with background script messaging,
 * allowing the SDK to work in extension context.
 */

import type {
  OkoWalletInterface,
  OkoWalletState,
  OkoWalletMsg,
  OkoWalletMsgOpenModal,
  WalletInfo,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";
import type { OpenModalError } from "@oko-wallet/oko-sdk-core";
import { EventEmitter3 } from "@oko-wallet/oko-sdk-core";
import type {
  OkoWalletCoreEvent2,
  OkoWalletCoreEventHandler2,
} from "@oko-wallet/oko-sdk-core";
import { sendToBackground } from "./bridge";

export class ExtensionOkoWallet implements OkoWalletInterface {
  state: OkoWalletState = {
    authType: null,
    email: null,
    publicKey: null,
    name: null,
  };

  apiKey: string;
  iframe: HTMLIFrameElement = null as any; // Not used in extension
  activePopupId: string | null = null;
  activePopupWindow: Window | null = null;
  sdkEndpoint: string;
  eventEmitter: EventEmitter3<OkoWalletCoreEvent2, OkoWalletCoreEventHandler2>;
  origin: string;
  waitUntilInitialized: Promise<Result<OkoWalletState, string>>;

  constructor(apiKey: string, sdkEndpoint: string) {
    this.apiKey = apiKey;
    this.sdkEndpoint = sdkEndpoint;
    this.origin = new URL(sdkEndpoint).origin;
    this.eventEmitter = new EventEmitter3();

    // Initialize by loading state from background
    this.waitUntilInitialized = this._init();
  }

  private async _init(): Promise<Result<OkoWalletState, string>> {
    try {
      const response = await sendToBackground<{
        isConnected: boolean;
        evmAddress: string | null;
        cosmosPublicKey: string | null;
      }>("GET_STATE", null);

      if (response.success && response.data?.cosmosPublicKey) {
        this.state.publicKey = response.data.cosmosPublicKey;
      }

      return { success: true, data: this.state };
    } catch (error) {
      return { success: false, err: String(error) };
    }
  }

  /**
   * Send message - handles some messages locally, others via background
   */
  async sendMsgToIframe(msg: OkoWalletMsg): Promise<OkoWalletMsg> {
    await this.waitUntilInitialized;

    console.debug("[ExtensionOkoWallet] sendMsgToIframe:", msg.msg_type);

    // Handle get_cosmos_chain_info locally by fetching from chain registry
    if (msg.msg_type === "get_cosmos_chain_info") {
      return this._handleGetCosmosChainInfo(msg);
    }

    // Other messages go to background
    const response = await sendToBackground<any>("OKO_WALLET_MSG", {
      ...msg,
    });

    if (response.success) {
      return {
        target: "oko_sdk",
        msg_type: `${msg.msg_type}_ack`,
        payload: { success: true, data: response.data },
      };
    } else {
      return {
        target: "oko_sdk",
        msg_type: `${msg.msg_type}_ack`,
        payload: { success: false, err: response.error },
      };
    }
  }

  /**
   * Map chain ID to chain registry directory name
   */
  private _getChainRegistryPath(chainId: string): string {
    // Common chain ID to registry path mappings
    const chainIdToPath: Record<string, string> = {
      "osmosis-1": "osmosis",
      "cosmoshub-4": "cosmoshub",
      "juno-1": "juno",
      "stargaze-1": "stargaze",
      "akashnet-2": "akash",
      "secret-4": "secretnetwork",
      "injective-1": "injective",
      "neutron-1": "neutron",
      "noble-1": "noble",
      "stride-1": "stride",
    };

    return chainIdToPath[chainId] || chainId.split("-")[0];
  }

  // Default supported chains when chain_id is null
  private readonly _defaultChains = [
    "osmosis-1",
    "cosmoshub-4",
    "juno-1",
    "stargaze-1",
    "neutron-1",
    "noble-1",
    "stride-1",
  ];

  /**
   * Fetch chain info from Cosmos chain registry
   */
  private async _handleGetCosmosChainInfo(msg: OkoWalletMsg): Promise<OkoWalletMsg> {
    try {
      const chainId = (msg.payload as any)?.chain_id;

      // If chain_id is null, fetch all default chains
      const chainIds = chainId ? [chainId] : this._defaultChains;

      console.debug("[ExtensionOkoWallet] Fetching chain info for:", chainIds);

      const chainInfos = await Promise.all(
        chainIds.map((id) => this._fetchChainInfo(id).catch((err) => {
          console.warn(`[ExtensionOkoWallet] Failed to fetch ${id}:`, err);
          return null;
        }))
      );

      // Filter out failed fetches
      const validChainInfos = chainInfos.filter((info): info is NonNullable<typeof info> => info !== null);

      if (validChainInfos.length === 0) {
        throw new Error("Failed to fetch any chain info");
      }

      return {
        target: "oko_sdk",
        msg_type: "get_cosmos_chain_info_ack",
        payload: { success: true, data: validChainInfos },
      };
    } catch (error) {
      console.error("[ExtensionOkoWallet] Failed to get chain info:", error);
      return {
        target: "oko_sdk",
        msg_type: "get_cosmos_chain_info_ack",
        payload: { success: false, err: String(error) },
      };
    }
  }

  /**
   * Fetch single chain info from registry
   */
  private async _fetchChainInfo(chainId: string): Promise<any> {
    const chainPath = this._getChainRegistryPath(chainId);
    const registryUrl = `https://raw.githubusercontent.com/cosmos/chain-registry/master/${chainPath}/chain.json`;
    const assetListUrl = `https://raw.githubusercontent.com/cosmos/chain-registry/master/${chainPath}/assetlist.json`;

    const [chainResponse, assetResponse] = await Promise.all([
      fetch(registryUrl),
      fetch(assetListUrl).catch(() => null),
    ]);

    if (!chainResponse.ok) {
      throw new Error(`Failed to fetch chain info for ${chainId}: ${chainResponse.status}`);
    }

    const chainData = await chainResponse.json();
    const assetData = assetResponse?.ok ? await assetResponse.json() : null;

    return this._convertToKeplrChainInfo(chainData, assetData);
  }

  /**
   * Convert chain registry format to Keplr ChainInfo format
   */
  private _convertToKeplrChainInfo(chainData: any, assetData?: any): any {
    const stakingDenom = chainData.staking?.staking_tokens?.[0]?.denom;
    const prefix = chainData.bech32_prefix;

    // Get fee info from chain data
    const feeInfo = chainData.fees?.fee_tokens?.[0];

    // Find native asset info
    let nativeAsset = {
      coinDenom: chainData.pretty_name?.toUpperCase() || "UNKNOWN",
      coinMinimalDenom: stakingDenom || feeInfo?.denom || "unknown",
      coinDecimals: 6,
    };

    // If we have asset data, use it to get proper display info
    if (assetData?.assets) {
      const stakingAsset = assetData.assets.find(
        (a: any) => a.base === stakingDenom
      );
      if (stakingAsset) {
        const displayDenom = stakingAsset.denom_units?.find(
          (u: any) => u.denom === stakingAsset.display
        );
        nativeAsset = {
          coinDenom: stakingAsset.symbol || stakingAsset.display?.toUpperCase() || nativeAsset.coinDenom,
          coinMinimalDenom: stakingAsset.base || nativeAsset.coinMinimalDenom,
          coinDecimals: displayDenom?.exponent || 6,
        };
      }
    }

    // Get gas price from chain data or use defaults
    const gasPriceStep = feeInfo
      ? {
          low: feeInfo.low_gas_price ?? 0.0025,
          average: feeInfo.average_gas_price ?? 0.025,
          high: feeInfo.high_gas_price ?? 0.04,
        }
      : {
          low: 0.0025,
          average: 0.025,
          high: 0.04,
        };

    return {
      chainId: chainData.chain_id,
      chainName: chainData.chain_name,
      rpc: chainData.apis?.rpc?.[0]?.address,
      rest: chainData.apis?.rest?.[0]?.address,
      stakeCurrency: nativeAsset,
      bip44: {
        coinType: chainData.slip44 || 118,
      },
      bech32Config: {
        bech32PrefixAccAddr: prefix,
        bech32PrefixAccPub: `${prefix}pub`,
        bech32PrefixValAddr: `${prefix}valoper`,
        bech32PrefixValPub: `${prefix}valoperpub`,
        bech32PrefixConsAddr: `${prefix}valcons`,
        bech32PrefixConsPub: `${prefix}valconspub`,
      },
      currencies: [nativeAsset],
      feeCurrencies: [
        {
          ...nativeAsset,
          gasPriceStep,
        },
      ],
    };
  }

  async openModal(
    msg: OkoWalletMsgOpenModal
  ): Promise<Result<OpenModalAckPayload, OpenModalError>> {
    const dappOrigin = window.location.origin;

    const response = await sendToBackground<OpenModalAckPayload>("OPEN_MODAL", {
      msg_type: msg.msg_type,
      payload: msg.payload,
      host_origin: dappOrigin,
    });

    if (response.success) {
      return { success: true, data: response.data as OpenModalAckPayload };
    } else {
      return { success: false, err: { type: "error", error: response.error || "Unknown error" } as OpenModalError };
    }
  }

  async openSignInModal(): Promise<void> {
    await sendToBackground("OPEN_OKO_ATTACHED", { url: "" });
  }

  closeModal(): void {
    // No-op in extension
  }

  async signIn(type: any): Promise<void> {
    await sendToBackground("OPEN_OKO_ATTACHED", { url: `?signIn=${type}` });
  }

  async signOut(): Promise<void> {
    await sendToBackground("DISCONNECT", null);
    this.state = {
      authType: null,
      email: null,
      publicKey: null,
      name: null,
    };
  }

  async getPublicKey(): Promise<string | null> {
    if (this.state.publicKey) {
      return this.state.publicKey;
    }

    const response = await sendToBackground<{
      isConnected: boolean;
      cosmosPublicKey: string | null;
    }>("GET_STATE", null);

    if (response.success && response.data?.cosmosPublicKey) {
      this.state.publicKey = response.data.cosmosPublicKey;
      return this.state.publicKey;
    }

    return null;
  }

  async getPublicKeyEd25519(): Promise<string | null> {
    const response = await sendToBackground<{
      svmPublicKey: string | null;
    }>("GET_STATE", null);

    return response.data?.svmPublicKey || null;
  }

  async getEmail(): Promise<string | null> {
    return this.state.email;
  }

  async getName(): Promise<string | null> {
    return this.state.name;
  }

  async getWalletInfo(): Promise<WalletInfo | null> {
    const publicKey = await this.getPublicKey();
    if (!publicKey) return null;

    return {
      publicKey,
      email: this.state.email,
      name: this.state.name,
    } as WalletInfo;
  }

  async getAuthType(): Promise<AuthType | null> {
    return this.state.authType;
  }

  async startEmailSignIn(email: string): Promise<void> {
    // Not implemented in extension
    throw new Error("Email sign-in not supported in extension");
  }

  async completeEmailSignIn(email: string, code: string): Promise<void> {
    // Not implemented in extension
    throw new Error("Email sign-in not supported in extension");
  }

  on(handlerDef: OkoWalletCoreEventHandler2): void {
    this.eventEmitter.on(handlerDef);
  }
}
