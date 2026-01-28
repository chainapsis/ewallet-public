/**
 * EVM Provider - EIP-1193 compatible provider for browser extension
 *
 * Implements the Ethereum Provider API used by dApps like Uniswap, OpenSea, etc.
 * Uses OkoEthWallet from SDK with ExtensionOkoWallet for communication.
 */

import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import type { OkoEthWalletInterface } from "@oko-wallet/oko-sdk-eth";
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

    // Listen for provider events from background
    this._setupEventListener();

    // Initialize in background
    this._initState();
  }

  private _setupEventListener(): void {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;

      const message = event.data;
      if (message?.target !== "oko-injected") return;
      if (message?.type !== "PROVIDER_EVENT") return;

      const { event: providerEvent, payload } = message;
      console.debug("[oko-evm] Provider event:", providerEvent, payload);

      this._emit(providerEvent as ProviderEvent, payload);
    });
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

  /**
   * Sync EVM address to background state for popup display
   */
  private _syncEvmAddress(address: string): void {
    sendToBackground("SYNC_EVM_ADDRESS", { evmAddress: address }).catch(() => {
      // Silently ignore sync failures
    });
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

  // RPC methods that need network access - route through background to bypass CSP
  private readonly _networkRpcMethods = new Set([
    "eth_call",
    "eth_getBalance",
    "eth_getTransactionCount",
    "eth_getCode",
    "eth_estimateGas",
    "eth_gasPrice",
    "eth_maxPriorityFeePerGas",
    "eth_feeHistory",
    "eth_getBlockByNumber",
    "eth_getBlockByHash",
    "eth_blockNumber",
    "eth_getTransactionByHash",
    "eth_getTransactionReceipt",
    "eth_getLogs",
    "eth_sendRawTransaction",
    "net_version",
  ]);

  /**
   * EIP-1193 request method
   * Routes network calls through background to bypass CSP
   */
  async request<T = unknown>(args: RequestArguments): Promise<T> {
    await this._ensureInitialized();

    // eth_chainId - return directly
    if (args.method === "eth_chainId") {
      return "0x1" as T; // Ethereum mainnet
    }

    // eth_accounts - return cached address
    if (args.method === "eth_accounts") {
      const address = this._ethWallet?.state.address;
      return (address ? [address] : []) as T;
    }

    // eth_requestAccounts - handle sign-in flow
    if (args.method === "eth_requestAccounts") {
      let address: string | null | undefined = this._ethWallet?.state.address;
      if (!address) {
        // Need to sign in
        await this._extensionWallet!.openSignInModal();
        // Re-fetch from SDK
        const provider = await this._ethWallet!.getEthereumProvider();
        const accounts = await provider.request({ method: "eth_accounts" } as any);
        address = (accounts as string[])?.[0];
      }
      if (address) {
        this._syncEvmAddress(address);
        return [address] as T;
      }
      return [] as T;
    }

    // Signing methods - use SDK modal with wrapped provider
    if (
      args.method === "personal_sign" ||
      args.method === "eth_signTypedData_v4" ||
      args.method === "eth_sendTransaction" ||
      args.method === "eth_signTransaction"
    ) {
      const provider = await this._ethWallet!.getEthereumProvider();

      // Wrap the provider's internal request to route RPC calls through background
      const originalRequest = provider.request.bind(provider);
      const wrappedRequest = async (innerArgs: any) => {
        // If it's a network RPC call, route through background
        if (this._networkRpcMethods.has(innerArgs.method)) {
          const response = await sendToBackground<unknown>("ETH_RPC_CALL", {
            method: innerArgs.method,
            params: innerArgs.params,
          });
          if (response.success) {
            return response.data;
          }
          throw new Error(response.error || `RPC call failed: ${innerArgs.method}`);
        }
        // Otherwise use original
        return originalRequest(innerArgs);
      };

      // Replace provider's request method so internal calls go through our wrapper
      provider.request = wrappedRequest as any;

      try {
        // Now call through the wrapped version
        return await provider.request(args as any) as T;
      } finally {
        // Restore original request method
        provider.request = originalRequest;
      }
    }

    // Network RPC methods - route through background to bypass CSP
    if (this._networkRpcMethods.has(args.method)) {
      const response = await sendToBackground<T>("ETH_RPC_CALL", {
        method: args.method,
        params: args.params,
      });

      if (response.success) {
        return response.data as T;
      }
      throw new Error(response.error || `RPC call failed: ${args.method}`);
    }

    // wallet_* methods
    if (args.method === "wallet_switchEthereumChain" || args.method === "wallet_addEthereumChain") {
      return null as T; // No-op for now
    }

    // Fallback - try SDK provider
    const provider = await this._ethWallet!.getEthereumProvider();
    return provider.request(args as any) as Promise<T>;
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

  private _emit(event: ProviderEvent, ...args: unknown[]): void {
    const handlers = this._eventListeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[oko-evm] Error in ${event} handler:`, error);
        }
      });
    }
  }
}
