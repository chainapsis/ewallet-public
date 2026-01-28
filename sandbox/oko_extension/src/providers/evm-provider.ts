/**
 * EVM Provider - EIP-1193 compatible provider for browser extension
 *
 * Implements the Ethereum Provider API used by dApps like Uniswap, OpenSea, etc.
 * Uses OkoEthWallet from SDK with ExtensionOkoWallet for communication.
 */

import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import type { OkoEthWalletInterface } from "@oko-wallet/oko-sdk-eth";
import { ExtensionOkoWallet } from "./extension-oko-wallet";
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
  public readonly isMetaMask = true;
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

    // Forward events from SDK provider
    try {
      const provider = await ethWallet.getEthereumProvider();
      provider.on("connect", (info: unknown) => this._emit("connect", info));
      provider.on("disconnect", (error: unknown) => this._emit("disconnect", error));
      provider.on("chainChanged", (chainId: unknown) => this._emit("chainChanged", chainId));
      provider.on("accountsChanged", (accounts: unknown) => this._emit("accountsChanged", accounts));
    } catch (error) {
      console.debug("[oko-evm] Failed to setup event forwarding:", error);
    }
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
   * EIP-1193 request method - delegates to SDK provider
   */
  async request<T = unknown>(args: RequestArguments): Promise<T> {
    const wallet = await this._ensureInitialized();
    const provider = await wallet.getEthereumProvider();

    // Handle eth_requestAccounts specially to trigger sign-in flow
    if (args.method === "eth_requestAccounts") {
      // Cast to any because SDK provider expects strictly typed RpcMethod
      const accounts = await provider.request(args as any);
      if (!accounts || (accounts as string[]).length === 0) {
        // Need to sign in
        await this._extensionWallet!.openSignInModal();
        // Re-fetch accounts after sign-in
        return provider.request(args as any) as Promise<T>;
      }
      return accounts as T;
    }

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
