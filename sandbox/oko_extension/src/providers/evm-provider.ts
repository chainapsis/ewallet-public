/**
 * EVM Provider - EIP-1193 compatible provider for browser extension
 *
 * Implements the Ethereum Provider API used by dApps like Uniswap, OpenSea, etc.
 * Uses OkoEthWallet from SDK with ExtensionOkoWallet for communication.
 */

import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import type { OkoEthWalletInterface } from "@oko-wallet/oko-sdk-eth";
import type { MakeEthereumSigData, ChainInfoForAttachedModal } from "@oko-wallet/oko-sdk-core";
import { ExtensionOkoWallet } from "./extension-oko-wallet";
import { sendToBackground } from "./bridge";
import { OKO_ATTACHED_URL, OKO_API_KEY } from "@/shared/constants";

// EIP-1193 event types
type ProviderEvent =
  | "connect"
  | "disconnect"
  | "chainChanged"
  | "accountsChanged"
  | "message";

type EventHandler = (...args: unknown[]) => void;

interface RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

export class ExtensionEvmProvider {
  // EIP-1193 properties
  public readonly isOko = true;

  private _ethWallet: OkoEthWalletInterface | null = null;
  private _extensionWallet: ExtensionOkoWallet | null = null;
  private _initPromise: Promise<void> | null = null;
  private _eventListeners: Map<ProviderEvent, Set<EventHandler>> = new Map();

  constructor() {
    // Bind methods
    this.request = this.request.bind(this);
    this.enable = this.enable.bind(this);
    this.send = this.send.bind(this);
    this.sendAsync = this.sendAsync.bind(this);
    this.on = this.on.bind(this);
    this.removeListener = this.removeListener.bind(this);

    // Initialize in background
    this._initState();
  }

  private async _ensureInitialized(): Promise<OkoEthWalletInterface> {
    if (this._ethWallet) {
      return this._ethWallet;
    }

    if (!this._initPromise) {
      this._initPromise = this._init();
    }

    await this._initPromise;
    return this._ethWallet!;
  }

  private async _init(): Promise<void> {
    const extensionWallet = new ExtensionOkoWallet(OKO_API_KEY, OKO_ATTACHED_URL);
    await extensionWallet.waitUntilInitialized;
    this._extensionWallet = extensionWallet;

    // OkoEthWallet constructor returns instance but types say void - need cast
    const ethWallet = new OkoEthWallet(extensionWallet) as unknown as OkoEthWalletInterface;
    await ethWallet.waitUntilInitialized;
    this._ethWallet = ethWallet;

    // Note: Event forwarding from SDK provider disabled to prevent infinite loops
    // dApps should poll eth_accounts instead of relying on accountsChanged events
  }

  private async _initState(): Promise<void> {
    try {
      await this._ensureInitialized();
    } catch (error) {
      console.debug("[oko-evm] Failed to init state:", error);
    }
  }

  get chainId(): string {
    if (this._ethWallet?.provider) {
      return this._ethWallet.provider.chainId;
    }
    return "0x1"; // Default to Ethereum mainnet
  }

  get selectedAddress(): string | null {
    return this._ethWallet?.state.address || null;
  }

  get isConnected(): boolean {
    return this._ethWallet?.provider?.isConnected ?? false;
  }

  /**
   * EIP-1193 request method
   * Routes RPC calls through background to avoid CSP restrictions
   * Signing operations use SDK's openModal
   */
  async request<T = unknown>(args: RequestArguments): Promise<T> {
    await this._ensureInitialized();

    // Handle eth_requestAccounts specially to trigger sign-in flow
    if (args.method === "eth_requestAccounts") {
      const state = await sendToBackground<{ evmAddress: string | null }>("GET_STATE", null);
      if (state.success && state.data?.evmAddress) {
        return [state.data.evmAddress] as T;
      }
      // Need to sign in
      await this._extensionWallet!.openSignInModal();
      // Re-fetch after sign-in
      const newState = await sendToBackground<{ evmAddress: string | null }>("GET_STATE", null);
      if (newState.success && newState.data?.evmAddress) {
        return [newState.data.evmAddress] as T;
      }
      return [] as T;
    }

    // eth_accounts - return cached address
    if (args.method === "eth_accounts") {
      const state = await sendToBackground<{ evmAddress: string | null }>("GET_STATE", null);
      if (state.success && state.data?.evmAddress) {
        return [state.data.evmAddress] as T;
      }
      return [] as T;
    }

    // Chain info
    if (args.method === "eth_chainId") {
      return "0x1" as T; // Ethereum mainnet
    }

    // Signing methods - use ExtensionOkoWallet.openModal directly
    if (
      args.method === "personal_sign" ||
      args.method === "eth_signTypedData_v4" ||
      args.method === "eth_sendTransaction" ||
      args.method === "eth_signTransaction"
    ) {
      // Get signer address from state
      const state = await sendToBackground<{ evmAddress: string | null }>("GET_STATE", null);
      const signerAddress = state.data?.evmAddress;
      if (!signerAddress) {
        throw new Error("Wallet not connected");
      }

      // Build chain info for modal
      const chainInfo: ChainInfoForAttachedModal = {
        chain_id: "eip155:1",
        chain_name: "Ethereum",
        rpc_url: "https://eth.llamarpc.com",
        currencies: [{ coinDenom: "ETH", coinMinimalDenom: "wei", coinDecimals: 18 }],
        bip44: { coinType: 60 },
        features: ["eth-address-gen", "eth-key-sign"],
        evm: { chainId: 1, rpc: "https://eth.llamarpc.com" },
      };

      const origin = window.location.origin;

      // Build signing data based on method
      let sigData: MakeEthereumSigData;
      const params = args.params as unknown[];

      if (args.method === "personal_sign") {
        // personal_sign params: [message, address]
        sigData = {
          chain_type: "eth",
          sign_type: "arbitrary",
          payload: {
            origin,
            chain_info: chainInfo,
            signer: signerAddress,
            data: {
              message: params[0] as string,
            },
          },
        };
      } else if (args.method === "eth_signTypedData_v4") {
        // eth_signTypedData_v4 params: [address, typedData]
        sigData = {
          chain_type: "eth",
          sign_type: "eip712",
          payload: {
            origin,
            chain_info: chainInfo,
            signer: signerAddress,
            data: {
              version: "4",
              serialized_typed_data: typeof params[1] === "string" ? params[1] : JSON.stringify(params[1]),
            },
          },
        };
      } else {
        // eth_sendTransaction / eth_signTransaction params: [transaction]
        sigData = {
          chain_type: "eth",
          sign_type: "tx",
          payload: {
            origin,
            chain_info: chainInfo,
            signer: signerAddress,
            data: {
              transaction: params[0] as any,
            },
          },
        };
      }

      const result = await this._extensionWallet!.openModal({
        target: "oko_attached",
        msg_type: "open_modal",
        payload: {
          modal_type: "eth/make_signature" as const,
          modal_id: crypto.randomUUID(),
          data: sigData,
        },
      });

      if (result.success) {
        // Extract signature from result based on response type
        const ackPayload = result.data as {
          type?: string;
          data?: { sig_result?: { type: string; signature?: string; signedTransaction?: string } };
        };

        if (ackPayload?.type === "approve" && ackPayload.data?.sig_result) {
          const sigResult = ackPayload.data.sig_result;
          if (sigResult.type === "signature") {
            return sigResult.signature as T;
          } else if (sigResult.type === "signed_transaction") {
            return sigResult.signedTransaction as T;
          }
        }

        // Fallback for other response formats
        return result.data as T;
      } else {
        const err = result.err as { type?: string; error?: string } | undefined;
        throw new Error(err?.error || "Signing failed");
      }
    }

    // Other RPC calls - route through background to avoid CSP
    const response = await sendToBackground<T>("ETH_RPC_CALL", {
      method: args.method,
      params: args.params,
    });

    if (response.success) {
      return response.data as T;
    }
    throw new Error(response.error || `RPC call failed: ${args.method}`);
  }

  /**
   * Legacy enable method (deprecated but still used by some dApps)
   */
  async enable(): Promise<string[]> {
    return this.request({ method: "eth_requestAccounts" });
  }

  /**
   * Legacy send method (deprecated)
   */
  send(
    methodOrPayload: string | object,
    paramsOrCallback?: unknown[] | ((error: Error | null, result?: unknown) => void)
  ): unknown {
    if (typeof methodOrPayload === "string") {
      return this.request({
        method: methodOrPayload,
        params: paramsOrCallback as unknown[],
      });
    }

    const payload = methodOrPayload as { method: string; params?: unknown[] };
    const callback = paramsOrCallback as (
      error: Error | null,
      result?: unknown
    ) => void;

    this.request(payload)
      .then((result) => callback(null, { result }))
      .catch((error) => callback(error));
  }

  /**
   * Legacy sendAsync method (deprecated)
   */
  sendAsync(
    payload: { method: string; params?: unknown[]; id?: number },
    callback: (error: Error | null, result?: unknown) => void
  ): void {
    this.request(payload)
      .then((result) =>
        callback(null, {
          id: payload.id,
          jsonrpc: "2.0",
          result,
        })
      )
      .catch((error) => callback(error));
  }

  /**
   * EIP-1193 event handling
   */
  on(event: ProviderEvent, handler: EventHandler): this {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event)!.add(handler);
    return this;
  }

  removeListener(event: ProviderEvent, handler: EventHandler): this {
    this._eventListeners.get(event)?.delete(handler);
    return this;
  }
}
