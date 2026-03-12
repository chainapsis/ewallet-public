import { v4 as uuidv4 } from "uuid";
import type { Address, RpcError, TypedDataDefinition } from "viem";
import {
  hexToString,
  isAddress,
  isAddressEqual,
  serializeTypedData,
} from "viem";

import { ProviderEventEmitter } from "./emitter";
import {
  EthereumRpcError,
  isConnectionError,
  ProviderRpcErrorCode,
  RpcErrorCode,
} from "./error";
import type {
  EIP1193Provider,
  OkoEIP1193ProviderOptions,
  OkoEthRpcChain,
  OkoEthRpcChainWithStatus,
  ProviderConnectInfo,
} from "./types";
import type {
  PublicRpcMethod,
  RpcMethod,
  RpcRequestArgs,
  RpcResponse,
  RpcResponseData,
  WalletRpcMethod,
} from "@oko-wallet-sdk-eth/rpc";
import { PUBLIC_RPC_METHODS } from "@oko-wallet-sdk-eth/rpc";
import type { OkoEthSigner } from "@oko-wallet-sdk-eth/types";
import {
  parseTypedData,
  validateChain,
  validateHexChainId,
} from "@oko-wallet-sdk-eth/utils";
import { VERSION } from "@oko-wallet-sdk-eth/version";

export class OkoEIP1193Provider
  extends ProviderEventEmitter
  implements EIP1193Provider
{
  protected signer: OkoEthSigner | null;

  private activeChainState: OkoEthRpcChain;
  private addedChainsState: OkoEthRpcChainWithStatus[];

  private lastConnectedEmittedEvent: "connect" | "disconnect" | null;

  public readonly name: string = "OkoEIP1193Provider";

  constructor(options: OkoEIP1193ProviderOptions) {
    super();

    this.lastConnectedEmittedEvent = null;

    if (options.chains.length === 0) {
      throw new Error("No chains provided");
    }

    for (const chain of options.chains) {
      const result = validateChain(chain);
      if (result.error) {
        throw new Error(result.error);
      }
    }

    this.signer = options.signer ?? null;

    this.addedChainsState = options.chains.map((chain) => ({
      ...chain,
      connected: false,
    }));

    this.activeChainState = this.addedChainsState[0];

    this._handleConnected(true, { chainId: this.activeChainState.chainId });

    this.request = this.request.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  get chainId(): string {
    return this.activeChainState.chainId;
  }

  get activeChain(): OkoEthRpcChain {
    return this.activeChainState;
  }

  get addedChains(): ReadonlyArray<OkoEthRpcChainWithStatus> {
    return this.addedChainsState;
  }

  get isConnected(): boolean {
    return this.addedChainsState.some((chain) => chain.connected);
  }

  /**
   * Request an RPC method
   * @param args - The RPC request arguments to handle
   * @returns The RPC response data
   * @throws RpcError if the request fails
   */
  async request<M extends RpcMethod>(
    args: RpcRequestArgs<M>,
  ): Promise<RpcResponseData<M>> {
    this.validateRequestArgs(args);

    try {
      return await this.handleRequest(args);
    } catch (error: any) {
      if (isConnectionError(error)) {
        const rpcError = new EthereumRpcError(
          RpcErrorCode.ResourceUnavailable,
          error?.message || "Resource unavailable",
        );

        this._handleConnected(false, rpcError);
        throw rpcError;
      }

      throw error;
    }
  }

  /**
   * Handle RPC request under the hood
   * @param args - The RPC request arguments to handle
   * @returns The RPC response data
   * @throws RpcError if the request fails
   */
  protected async handleRequest<M extends RpcMethod>(
    args: RpcRequestArgs<M>,
  ): Promise<RpcResponseData<M>> {
    if (PUBLIC_RPC_METHODS.has(args.method as PublicRpcMethod)) {
      const result = await this.handlePublicRpcRequest(
        args as RpcRequestArgs<PublicRpcMethod>,
      );

      this._handleConnected(true, { chainId: this.activeChainState.chainId });

      return result;
    }

    return this.handleWalletRpcRequest(args as RpcRequestArgs<WalletRpcMethod>);
  }

  /**
   * Handle public RPC request under the hood
   * @param args - The RPC request arguments to handle
   * @returns The RPC response data
   * @throws RpcError if the request fails
   */
  protected async handlePublicRpcRequest<M extends PublicRpcMethod>(
    args: RpcRequestArgs<M>,
  ): Promise<RpcResponseData<M>> {
    switch (args.method) {
      case "web3_clientVersion":
        return `${this.name}/${VERSION}`;
      case "eth_chainId":
        return this.activeChainState.chainId;
      default: {
        const {
          rpcUrls: [rpcUrl],
        } = this.activeChainState;
        if (!rpcUrl) {
          throw new EthereumRpcError(
            RpcErrorCode.ResourceUnavailable,
            "No RPC URL for the active chain",
          );
        }

        const requestBody = {
          ...args,
          jsonrpc: "2.0",
          id: uuidv4(),
        };

        const res = await fetch(rpcUrl, {
          method: "POST",
          body: JSON.stringify(requestBody),
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = (await res.json()) as RpcResponse<RpcResponseData<M>>;

        if ("error" in data) {
          throw data.error;
        }
        return data.result;
      }
    }
  }

  /**
   * Handle wallet RPC request under the hood
   * @param args - The RPC request arguments to handle
   * @returns The RPC response data
   * @throws RpcError if the request fails
   * @dev Signer is required for wallet RPC methods
   */
  protected async handleWalletRpcRequest<M extends WalletRpcMethod>(
    args: RpcRequestArgs<M>,
  ): Promise<RpcResponseData<M>> {
    // Handle non-restricted wallet RPC methods
    switch (args.method) {
      case "wallet_addEthereumChain": {
        const [newChain] =
          args.params as RpcRequestArgs<"wallet_addEthereumChain">["params"];
        const validation = validateChain(newChain);
        if (!validation.isValid) {
          throw new EthereumRpcError(
            RpcErrorCode.InvalidInput,
            validation.error || "Invalid chain parameter",
          );
        }
        const existing = this.addedChainsState.find(
          (c) => c.chainId === newChain.chainId,
        );
        if (existing) {
          Object.assign(existing, newChain);
          existing.connected = false;
        } else {
          this.addedChainsState.push({ ...newChain, connected: false });
        }
        return null;
      }
      case "wallet_switchEthereumChain": {
        const [{ chainId: chainIdToSwitch }] =
          args.params as RpcRequestArgs<"wallet_switchEthereumChain">["params"];

        const chain = this.addedChainsState.find(
          (chain) => chain.chainId === chainIdToSwitch,
        );

        if (!chain) {
          throw new EthereumRpcError(
            ProviderRpcErrorCode.UnsupportedChain,
            `Chain ${chainIdToSwitch} not found`,
          );
        }

        const prevChainId = this.activeChainState?.chainId;
        this.activeChainState = chain;

        if (prevChainId !== chainIdToSwitch) {
          this._handleChainChanged(chainIdToSwitch);
        }
        this._handleConnected(true, { chainId: chainIdToSwitch });

        return null;
      }
      default:
        break;
    }

    // Handle restricted wallet RPC methods
    switch (args.method) {
      case "eth_accounts":
      case "eth_requestAccounts":
        this._handleConnected(true, { chainId: this.activeChainState.chainId });

        try {
          const { address } = this._getAuthenticatedSigner();
          return [address];
        } catch {
          return [];
        }
      case "eth_sendTransaction": {
        const [tx] =
          args.params as RpcRequestArgs<"eth_sendTransaction">["params"];
        const signedTx = await this.request({
          method: "eth_signTransaction",
          params: [tx],
        });

        const txHash = await this.request({
          method: "eth_sendRawTransaction",
          params: [signedTx],
        });

        this._handleConnected(true, {
          chainId: this.activeChainState?.chainId,
        });

        return txHash;
      }
      case "eth_signTransaction": {
        const [tx] =
          args.params as RpcRequestArgs<"eth_signTransaction">["params"];

        const { signer, address } = this._getAuthenticatedSigner();

        const result = await signer.sign({
          type: "sign_transaction",
          data: {
            address,
            transaction: tx,
          },
        });

        if (result.type !== "signed_transaction") {
          throw new EthereumRpcError(
            RpcErrorCode.Internal,
            "Invalid result type",
          );
        }

        this._handleConnected(true, { chainId: this.activeChainState.chainId });

        return result.signedTransaction;
      }
      case "eth_signTypedData_v4": {
        const [signWith, rawTypedData] =
          args.params as RpcRequestArgs<"eth_signTypedData_v4">["params"];

        const { signer, address } = this._getAuthenticatedSigner();

        if (!isAddressEqual(signWith, address)) {
          throw new EthereumRpcError(
            RpcErrorCode.InvalidInput,
            "Signer address mismatch",
          );
        }

        const typedData =
          typeof rawTypedData === "string"
            ? parseTypedData<TypedDataDefinition>(rawTypedData)
            : rawTypedData;

        if (typedData.domain && typedData.domain.chainId !== undefined) {
          const activeChainId = BigInt(this.activeChainState.chainId);
          const typedDataChainId = BigInt(typedData.domain.chainId);

          if (activeChainId !== typedDataChainId) {
            throw new EthereumRpcError(
              RpcErrorCode.InvalidParams,
              `${typedDataChainId} does not match ${activeChainId}`,
            );
          }
        }

        const result = await signer.sign({
          type: "sign_typedData_v4",
          data: {
            address,
            serializedTypedData: serializeTypedData(typedData),
          },
        });

        if (result.type !== "signature") {
          throw new EthereumRpcError(
            RpcErrorCode.Internal,
            "Invalid result type",
          );
        }

        this._handleConnected(true, { chainId: this.activeChainState.chainId });

        return result.signature;
      }
      case "personal_sign": {
        const [message, signWith] =
          args.params as RpcRequestArgs<"personal_sign">["params"];

        const { signer, address } = this._getAuthenticatedSigner();

        if (!isAddressEqual(signWith, address)) {
          throw new EthereumRpcError(
            RpcErrorCode.InvalidInput,
            "Signer address mismatch",
          );
        }

        const originalMessage = message.startsWith("0x")
          ? hexToString(message)
          : message;

        const result = await signer.sign({
          type: "personal_sign",
          data: {
            address,
            message: originalMessage,
          },
        });

        if (result.type !== "signature") {
          throw new EthereumRpcError(
            RpcErrorCode.Internal,
            "Invalid result type",
          );
        }

        this._handleConnected(true, { chainId: this.activeChainState.chainId });

        return result.signature;
      }
      default:
        throw new EthereumRpcError(
          RpcErrorCode.MethodNotSupported,
          "Method not supported",
        );
    }
  }

  /**
   * Get signer & address or throw if not authenticated
   */
  private _getAuthenticatedSigner(): {
    signer: OkoEthSigner;
    address: Address;
  } {
    const signer = this.signer;

    if (!signer) {
      throw new EthereumRpcError(
        ProviderRpcErrorCode.Unauthorized,
        "Signer is required for wallet RPC methods",
      );
    }

    const address = signer.getAddress();
    if (!address || !isAddress(address)) {
      throw new EthereumRpcError(
        ProviderRpcErrorCode.Unauthorized,
        "No authenticated signer for wallet RPC methods",
      );
    }
    return { signer, address };
  }

  /**
   * Validates the basic structure of RPC request arguments
   * @param args - The RPC request arguments to validate
   * @throws RpcError if the arguments are invalid
   */
  protected validateRequestArgs<M extends RpcMethod>(
    args: RpcRequestArgs<M>,
  ): void {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw new EthereumRpcError(
        RpcErrorCode.InvalidParams,
        "Expected a single, non-array, object argument.",
      );
    }

    const { method, params } = args;

    if (typeof method !== "string" || method.length === 0) {
      throw new EthereumRpcError(
        RpcErrorCode.InvalidParams,
        "Expected a non-empty string for method.",
      );
    }

    if (typeof params !== "undefined" && typeof params !== "object") {
      throw new EthereumRpcError(
        RpcErrorCode.InvalidParams,
        "Expected a single, non-array, object argument.",
      );
    }

    if (
      params !== undefined &&
      !Array.isArray(params) &&
      (typeof params !== "object" || params === null)
    ) {
      throw new EthereumRpcError(
        RpcErrorCode.InvalidParams,
        "Expected a single, non-array, object argument.",
      );
    }
  }

  /**
   * Central method to manage connection state and emit events
   * Prevents duplicate events and ensures proper state transitions
   * @param connected - Whether the connection is established
   * @param data - The data to emit
   */
  protected _handleConnected(
    connected: boolean,
    data: ProviderConnectInfo | EthereumRpcError,
  ): void {
    if (this.activeChainState) {
      const activeChainId = this.activeChainState.chainId;

      this.addedChainsState.forEach((chain) => {
        chain.connected = chain.chainId === activeChainId ? connected : false;
      });
    }

    if (connected && this.lastConnectedEmittedEvent !== "connect") {
      this.emit("connect", data as ProviderConnectInfo);
      this.lastConnectedEmittedEvent = "connect";
    } else if (
      !connected &&
      this.addedChainsState.every(({ connected }) => !connected) &&
      this.lastConnectedEmittedEvent !== "disconnect"
    ) {
      this.emit("disconnect", data as RpcError);
      this.lastConnectedEmittedEvent = "disconnect";
    }
  }

  /**
   * Handle chain changed event
   * @param chainId - The chain ID to handle
   * @dev Only emit the event, don't modify state in this method
   */
  protected _handleChainChanged(chainId: string) {
    const result = validateHexChainId(chainId);
    if (!result.isValid) {
      return;
    }

    this.emit("chainChanged", chainId);
  }

  /**
   * Handle accounts changed event
   * @param newAddress - The new addresses
   */
  protected _handleAccountsChanged(newAddress: Address[]): void {
    this.emit("accountsChanged", newAddress);
  }
}
