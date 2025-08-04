import type {
  Address,
  AddEthereumChainParameter as Chain,
  TypedDataDefinition,
} from "viem";
import {
  hexToString,
  isAddress,
  isAddressEqual,
  serializeTypedData,
} from "viem";
import { v4 as uuidv4 } from "uuid";

import { ErrorCodes, standardError } from "@keplr-ewallet-sdk-eth/errors";
import type {
  RpcMethod,
  RpcRequestArgs,
  RpcResponseData,
  PublicRpcMethod,
  WalletRpcMethod,
} from "@keplr-ewallet-sdk-eth/rpc";
import {
  RpcResponse,
  RpcError,
  UNSUPPORTED_RPC_METHODS,
  PUBLIC_RPC_METHODS,
} from "@keplr-ewallet-sdk-eth/rpc";
import {
  parseTypedData,
  isValidChainId,
  toSignableTransaction,
  validateChain,
} from "@keplr-ewallet-sdk-eth/utils";
import type {
  EIP1193Provider,
  EWalletEIP1193ProviderOptions,
  ProviderConnectInfo,
  ChainWithStatus,
} from "./types";
import { ProviderEventEmitter } from "./types";
import { VERSION } from "./version";

export class EWalletEIP1193Provider
  extends ProviderEventEmitter
  implements EIP1193Provider
{
  protected isInitialized: boolean;

  protected signer: EWalletEIP1193ProviderOptions["signer"];

  protected activeChain: Chain;
  protected addedChains: ChainWithStatus[];

  private lastConnectedEmittedEvent: "connect" | "disconnect" | null;

  public readonly isEWallet: true = true;
  public readonly version: string = VERSION;
  public readonly name: string = "EWalletEIP1193Provider";

  public ready: Promise<void> | null = null;

  constructor(options: EWalletEIP1193ProviderOptions) {
    super();

    this.isInitialized = false;
    this.lastConnectedEmittedEvent = null;

    // Initialize chains / active chain (without validation for now)
    this.addedChains = options.chains.map((chain) => ({
      ...chain,
      validationStatus: "pending",
      connected: false,
    }));

    this.activeChain = this.addedChains[0];

    // Start initialization immediately and store the promise
    this.ready = this._init(options);

    this.request = this.request.bind(this);
    this.on = this.on.bind(this);
    this.removeListener = this.removeListener.bind(this);
  }

  get chainId(): string {
    return this.activeChain.chainId;
  }

  get isConnected(): boolean {
    return this.addedChains.some((chain) => chain.connected);
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

    this.checkMethodSupport(args);

    try {
      const result = await this.handleRequest(args);

      // Set connected status upon successful request
      if (this.activeChain) {
        this._handleConnected(true, { chainId: this.activeChain.chainId });
      }

      return result;
    } catch (error: any) {
      if (this.isConnectionError(error)) {
        const rpcError = new RpcError({
          code: ErrorCodes.rpc.resourceUnavailable,
          message: error?.message || "Resource unavailable",
          data: error,
        });

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
      return this.handlePublicRpcRequest(
        args as RpcRequestArgs<PublicRpcMethod>,
      );
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
        return `${this.name}/${this.version}`;
      default:
        await this._validateActiveChain();

        const {
          rpcUrls: [rpcUrl],
        } = this.activeChain;
        if (!rpcUrl) {
          throw new RpcError(
            standardError.chainDisconnected({
              message: "No RPC URL for the active chain",
            }),
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

        if (RpcResponse.isError(data)) {
          throw new RpcError(data.error);
        }
        return data.result;
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

        let chainIdx = this.addedChains.findIndex(
          (c) => c.chainId === newChain.chainId,
        );
        let chain: ChainWithStatus;
        const isNew = chainIdx === -1; // new chain if not duplicated

        // check if the overwriting chain is the current active chain
        const wasActive =
          this.activeChain && this.activeChain.chainId === newChain.chainId;
        let original: ChainWithStatus | undefined = undefined;

        if (isNew) {
          // new chain: push directly
          chain = {
            ...newChain,
            validationStatus: "pending",
            connected: false,
          };
          this.addedChains.push(chain);
          chainIdx = this.addedChains.length - 1;
        } else {
          // overwriting chain: backup original and overwrite
          chain = this.addedChains[chainIdx];
          original = { ...chain };
          Object.assign(chain, newChain);
          chain.validationStatus = "pending";
          chain.connected = false;
        }

        let validationSucceeded = false;

        try {
          await this._manageChain(chain, true, true, false);
          validationSucceeded = true;
          chain.validationStatus = "valid";
          // if the overwriting chain is the current active chain, set connected to true
          if (wasActive) chain.connected = true;
        } catch (err) {
          // failed: remove new chain or restore original
          if (isNew) {
            this.addedChains.splice(chainIdx, 1);
          } else if (original) {
            Object.assign(chain, original);
            if (wasActive) this.activeChain = original;
          }
        }

        if (!validationSucceeded) {
          throw new RpcError(
            standardError.invalidParams({
              message: "Chain validation failed.",
              data: { chainId: newChain.chainId },
            }),
          );
        }

        return null;
      }
      case "wallet_switchEthereumChain": {
        const [{ chainId: chainIdToSwitch }] =
          args.params as RpcRequestArgs<"wallet_switchEthereumChain">["params"];

        const chain = this.addedChains.find(
          (chain) => chain.chainId === chainIdToSwitch,
        );

        if (!chain) {
          throw new RpcError(
            standardError.unsupportedChain({
              message: "Chain not found",
              data: {
                chainId: chainIdToSwitch,
              },
            }),
          );
        }

        const prevChainId = this.activeChain?.chainId;
        this.activeChain = chain;

        // Emit events in logical order: chainChanged first, then connect
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
    if (!this.signer) {
      throw new RpcError(
        standardError.unsupportedMethod({
          message: "Signer is required for wallet RPC methods",
          data: args.method,
        }),
      );
    }

    await this._validateActiveChain();

    switch (args.method) {
      case "eth_accounts":
      // CHECK: request account needs user interaction,
      // though we just return the signer address here as there's only one account
      case "eth_requestAccounts":
        this._handleConnected(true, { chainId: this.activeChain?.chainId });
        return [this.signer.address];
      case "eth_sendTransaction":
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

        this._handleConnected(true, { chainId: this.activeChain?.chainId });

        return txHash;
      case "eth_signTransaction": {
        const [tx] =
          args.params as RpcRequestArgs<"eth_signTransaction">["params"];

        const signableTx = toSignableTransaction(tx);

        const { signedTransaction } =
          await this.signer.sign<"sign_transaction">({
            type: "sign_transaction",
            data: {
              address: this.signer.address,
              transaction: signableTx,
            },
          });

        this._handleConnected(true, { chainId: this.activeChain?.chainId });

        return signedTransaction;
      }
      case "eth_signTypedData_v4": {
        const [signWith, rawTypedData] =
          args.params as RpcRequestArgs<"eth_signTypedData_v4">["params"];

        if (!isAddressEqual(signWith, this.signer.address)) {
          throw new RpcError(
            standardError.invalidInput({
              message: "Signer address mismatch",
              data: {
                signWith,
                signerAddress: this.signer.address,
              },
            }),
          );
        }

        // The client may pass serialized JSON; ensure we have an object
        const typedData =
          typeof rawTypedData === "string"
            ? parseTypedData<TypedDataDefinition>(rawTypedData)
            : rawTypedData;

        const { signature } = await this.signer.sign<"sign_typedData_v4">({
          type: "sign_typedData_v4",
          data: {
            address: this.signer.address,
            serializedTypedData: serializeTypedData(typedData),
          },
        });

        this._handleConnected(true, { chainId: this.activeChain?.chainId });

        return signature;
      }
      case "personal_sign": {
        const [message, signWith] =
          args.params as RpcRequestArgs<"personal_sign">["params"];

        if (!isAddressEqual(signWith, this.signer.address)) {
          throw new RpcError(
            standardError.invalidInput({
              message: "Signer address mismatch",
              data: {
                signWith,
                signerAddress: this.signer.address,
              },
            }),
          );
        }

        // Decode hex-encoded UTF-8 string back to original message
        // CHECK: is this enough?
        const originalMessage = message.startsWith("0x")
          ? hexToString(message)
          : message;

        const { signature } = await this.signer.sign<"personal_sign">({
          type: "personal_sign",
          data: {
            address: this.signer.address,
            message: originalMessage,
          },
        });

        this._handleConnected(true, { chainId: this.activeChain?.chainId });

        return signature;
      }
      default:
        throw new RpcError(
          standardError.unsupportedMethod({
            message: "Method not supported",
            data: args.method,
          }),
        );
    }
  }

  /**
   * Validate the active chain before making network requests
   */
  private async _validateActiveChain(): Promise<void> {
    if (!this.activeChain) {
      throw new RpcError(standardError.invalidRequest({}));
    }

    const activeChainStatus = this.addedChains.find(
      (chain) => chain.chainId === this.activeChain.chainId,
    );

    if (activeChainStatus?.validationStatus !== "valid") {
      throw new RpcError(
        standardError.invalidRequest({
          message: "Active chain is not valid.",
          data: { chainId: this.activeChain.chainId },
        }),
      );
    }
  }

  /**
   * Internal method to manage a chain (validate, add, and optionally switch)
   * @param chain - The chain to manage
   * @param skipDuplicateCheck - Whether to skip checking for existing chains
   * @param validationOnly - If true, only validate the chain without adding it
   * @param shouldSwitch - Whether to switch to the managed chain (default: true)
   * @returns Promise that resolves when chain is managed/validated
   */
  private async _manageChain(
    chain: Chain,
    skipDuplicateCheck = false,
    validationOnly = false,
    shouldSwitch = true,
  ): Promise<void> {
    // Skip duplicate check during validation-only mode for initialization
    const chainsToCheck = validationOnly ? [] : this.addedChains;
    const result = validateChain(chain, chainsToCheck);
    if (!result.isValid) {
      throw new Error(result.error || "Chain validation failed");
    }

    const {
      rpcUrls: [rpcUrl],
    } = chain;

    if (!rpcUrl) {
      throw new Error("No RPC URL for the chain");
    }

    // Validate chain by making a direct RPC call
    const requestBody = {
      method: "eth_chainId",
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

    const data = await res.json();

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    const rpcChainId = data.result;

    if (rpcChainId !== chain.chainId) {
      throw new Error(
        `Chain ID mismatch: expected ${chain.chainId}, got ${rpcChainId}`,
      );
    }

    // If validation only, mark as valid and stop here
    if (validationOnly) {
      const existingChain = this.addedChains.find(
        (c) => c.chainId === chain.chainId,
      );

      if (existingChain) {
        existingChain.validationStatus = "valid";
      }

      return;
    }

    // Add chain and update state (original logic)
    const prevActiveChain = this.activeChain;

    // Only switch to the new chain if shouldSwitch is true
    if (shouldSwitch) {
      this.activeChain = chain;
    }

    try {
      // Add chain to the list only if not already added
      if (!skipDuplicateCheck) {
        const existingChain = this.addedChains.find(
          (c) => c.chainId === chain.chainId,
        );
        if (!existingChain) {
          this.addedChains.push({
            ...chain,
            connected: false,
            validationStatus: "valid", // Chain was just validated successfully
          });
        } else {
          // Mark existing chain as valid since validation passed
          existingChain.validationStatus = "valid";
        }
      }

      // Emit events if we're switching to a different chain and shouldSwitch is true
      const prevChainId = prevActiveChain?.chainId;
      if (shouldSwitch && prevChainId !== rpcChainId && this.isInitialized) {
        this._handleChainChanged(rpcChainId);
        this._handleConnected(true, { chainId: rpcChainId });
      }
    } catch (error) {
      // Only restore previous chain if we were switching
      if (shouldSwitch) {
        this.activeChain = prevActiveChain;
      }
      throw error;
    }
  }

  /**
   * Initialize the provider asynchronously
   */
  protected async _init(options: EWalletEIP1193ProviderOptions): Promise<void> {
    const { signer } = options;

    // Set up signer
    if (signer) {
      if (!isAddress(signer.address)) {
        throw new Error("Invalid signer address");
      }

      if (typeof signer.sign !== "function") {
        throw new Error("Invalid signer");
      }

      this.signer = signer;
    }

    if (options.skipChainValidation) {
      this.addedChains.forEach((chain, idx) => {
        chain.validationStatus = "valid";
        chain.connected = idx === 0; // set the first chain as connected
      });

      this.activeChain = this.addedChains[0];

      this.isInitialized = true;
      this.emit<any>("_initialized", {});

      this._handleChainChanged(this.activeChain.chainId);
      this._handleConnected(true, { chainId: this.activeChain.chainId });
      if (this.signer && isAddress(this.signer.address)) {
        this._handleAccountsChanged(this.signer.address);
      }
      return;
    }

    await Promise.all(
      this.addedChains.map(async (chain) => {
        try {
          await this._manageChain(chain, true, true, false);
        } catch (err) {
          chain.validationStatus = "invalid";
          chain.connected = false;
        }
      }),
    );

    const firstValid = this.addedChains.find(
      (c) => c.validationStatus === "valid",
    );
    if (firstValid) {
      this.activeChain = firstValid;
      // Set initialized first so events can be emitted
      this.isInitialized = true;

      this.emit<any>("_initialized", {});

      this._handleChainChanged(this.activeChain.chainId);
      this._handleConnected(true, { chainId: this.activeChain.chainId });
      if (this.signer && isAddress(this.signer.address)) {
        this._handleAccountsChanged(this.signer.address);
      }
    } else {
      throw new Error("No valid chains found during provider initialization");
    }
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
      throw new RpcError(
        standardError.invalidParams({
          message: "Expected a single, non-array, object argument.",
          data: args,
        }),
      );
    }

    const { method, params } = args;

    if (typeof method !== "string" || method.length === 0) {
      throw new RpcError(
        standardError.invalidParams({
          message: "Expected a non-empty string for method.",
          data: args,
        }),
      );
    }

    if (typeof params !== "undefined" && typeof params !== "object") {
      throw new RpcError(
        standardError.invalidParams({
          message: "Expected a single, non-array, object argument.",
          data: args,
        }),
      );
    }

    if (
      params !== undefined &&
      !Array.isArray(params) &&
      (typeof params !== "object" || params === null)
    ) {
      throw new RpcError(
        standardError.invalidParams({
          message: "Expected a single, non-array, object argument.",
          data: args,
        }),
      );
    }
  }

  /**
   * Checks if the given method is supported by this provider
   * @param args - The RPC request arguments to check
   * @throws RpcError if the method is not supported
   */
  protected checkMethodSupport<M extends RpcMethod>(
    args: RpcRequestArgs<M>,
  ): void {
    if (UNSUPPORTED_RPC_METHODS.has(args.method)) {
      throw new RpcError(
        standardError.unsupportedMethod({
          data: args.method,
        }),
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
    data: ProviderConnectInfo | RpcError,
  ): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.activeChain) {
      const activeChainId = this.activeChain.chainId;

      this.addedChains.forEach((chain) => {
        chain.connected = chain.chainId === activeChainId ? connected : false;
      });
    }

    if (connected && this.lastConnectedEmittedEvent !== "connect") {
      this.emit("connect", data as ProviderConnectInfo);
      this.lastConnectedEmittedEvent = "connect";
    } else if (
      !connected &&
      this.addedChains.every(({ connected }) => !connected) &&
      this.lastConnectedEmittedEvent !== "disconnect"
    ) {
      this.emit("disconnect", data as RpcError);
      this.lastConnectedEmittedEvent = "disconnect";
    }
  }

  /**
   * Checks if the error is a connection error
   * @param error - The error to check
   * @returns True if the error is a connection error, false otherwise
   */
  protected isConnectionError(error: any): boolean {
    // Native fetch network errors (TypeError)
    if (error?.name === "TypeError" || error instanceof TypeError) {
      const message = error.message?.toLowerCase() || "";
      if (
        message.includes("fetch failed") ||
        message.includes("failed to fetch") ||
        message.includes("network error") ||
        message.includes("load failed") ||
        message.includes("networkerror when attempting to fetch")
      ) {
        return true;
      }
    }

    // JSON parsing errors could indicate malformed responses due to network issues
    if (error instanceof SyntaxError && error.message?.includes("JSON")) {
      return true;
    }

    // Provider error codes for disconnection
    if (
      error?.code === ErrorCodes.provider.disconnected ||
      error?.code === ErrorCodes.provider.chainDisconnected
    ) {
      return true;
    }

    // AbortError (when requests are cancelled due to timeouts)
    if (error?.name === "AbortError") {
      return true;
    }

    return false;
  }

  /**
   * Handle chain changed event
   * @param chainId - The chain ID to handle
   */
  protected _handleChainChanged(chainId: string) {
    if (!isValidChainId(chainId)) {
      return;
    }

    // Only emit the event, don't modify state here
    // State should be managed by the caller
    if (this.isInitialized) {
      this.emit("chainChanged", chainId);
    }
  }

  /**
   * Handle accounts changed event
   * @param newSelectedAddress - The new selected address
   */
  protected _handleAccountsChanged(newSelectedAddress: Address): void {
    this.emit("accountsChanged", [newSelectedAddress]);
  }
}

export async function initEWalletEIP1193Provider(
  options: EWalletEIP1193ProviderOptions,
): Promise<EWalletEIP1193Provider> {
  const provider = new EWalletEIP1193Provider(options);
  await provider.ready;
  return provider;
}
