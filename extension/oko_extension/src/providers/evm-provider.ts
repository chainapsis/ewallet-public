/**
 * EVM Provider - EIP-1193 compatible provider for browser extension
 *
 * Implements the Ethereum Provider API used by dApps like Uniswap, OpenSea, etc.
 * Communicates with the background service worker for wallet operations.
 */

import EventEmitter from "eventemitter3";
import { sendToBackground } from "./bridge";

// EIP-1193 event types
type ProviderEvent = "connect" | "disconnect" | "chainChanged" | "accountsChanged" | "message";

interface ProviderConnectInfo {
  chainId: string;
}

interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

interface RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

// Standard EIP-1193 error codes
const RpcErrorCode = {
  UserRejected: 4001,
  Unauthorized: 4100,
  UnsupportedMethod: 4200,
  Disconnected: 4900,
  ChainDisconnected: 4901,
  InvalidParams: -32602,
  Internal: -32603,
} as const;

export class ExtensionEvmProvider extends EventEmitter<ProviderEvent> {
  // EIP-1193 properties
  public readonly isMetaMask = true; // For compatibility with dApps that check for MetaMask
  public readonly isOko = true;

  private _chainId: string = "0x1"; // Default to Ethereum mainnet
  private _accounts: string[] = [];
  private _isConnected = false;

  constructor() {
    super();

    // Initialize state from background
    this._initState();

    // Bind methods
    this.request = this.request.bind(this);
    this.enable = this.enable.bind(this);
    this.send = this.send.bind(this);
    this.sendAsync = this.sendAsync.bind(this);
  }

  private async _initState(): Promise<void> {
    try {
      const response = await sendToBackground<{
        isConnected: boolean;
        evmAddress: string | null;
      }>("GET_STATE", null);

      if (response.success && response.data) {
        this._isConnected = response.data.isConnected;
        if (response.data.evmAddress) {
          this._accounts = [response.data.evmAddress];
        }
      }
    } catch (error) {
      console.debug("[oko-evm] Failed to init state:", error);
    }
  }

  get chainId(): string {
    return this._chainId;
  }

  get selectedAddress(): string | null {
    return this._accounts[0] || null;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * EIP-1193 request method
   */
  async request<T = unknown>(args: RequestArguments): Promise<T> {
    if (!args || typeof args !== "object") {
      throw this._createError(
        RpcErrorCode.InvalidParams,
        "Expected a single, non-array, object argument"
      );
    }

    const { method, params } = args;

    if (typeof method !== "string" || method.length === 0) {
      throw this._createError(
        RpcErrorCode.InvalidParams,
        "Expected a non-empty string for method"
      );
    }

    console.debug("[oko-evm] request:", method, params);

    // Handle some methods locally for performance
    switch (method) {
      case "eth_chainId":
        return this._chainId as T;

      case "eth_accounts":
        return this._accounts as T;

      case "net_version":
        return String(parseInt(this._chainId, 16)) as T;
    }

    // Forward to background
    const response = await sendToBackground("EVM_RPC_REQUEST", {
      method,
      params: params || [],
    });

    if (!response.success) {
      throw this._createError(
        RpcErrorCode.Internal,
        response.error || "Request failed"
      );
    }

    // Update local state based on response
    if (method === "eth_requestAccounts" || method === "eth_accounts") {
      const accounts = response.data as string[];
      if (accounts.length > 0) {
        this._accounts = accounts;
        this._isConnected = true;
        this.emit("connect", { chainId: this._chainId });
        this.emit("accountsChanged", accounts);
      }
    }

    if (method === "wallet_switchEthereumChain" && params) {
      const [{ chainId }] = params as [{ chainId: string }];
      if (chainId !== this._chainId) {
        this._chainId = chainId;
        this.emit("chainChanged", chainId);
      }
    }

    return response.data as T;
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
  send(methodOrPayload: string | object, paramsOrCallback?: unknown[] | Function): unknown {
    if (typeof methodOrPayload === "string") {
      // Synchronous call pattern: send(method, params)
      return this.request({
        method: methodOrPayload,
        params: paramsOrCallback as unknown[],
      });
    }

    // Async call pattern: send(payload, callback)
    const payload = methodOrPayload as { method: string; params?: unknown[] };
    const callback = paramsOrCallback as (error: Error | null, result?: unknown) => void;

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
   * Create a provider error
   */
  private _createError(code: number, message: string): ProviderRpcError {
    const error = new Error(message) as ProviderRpcError;
    error.code = code;
    return error;
  }
}
