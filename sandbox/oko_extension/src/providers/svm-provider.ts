/**
 * SVM Provider - Wallet Standard compatible wallet for Solana dApps
 *
 * Implements the Wallet Standard interface used by Solana dApps like
 * Raydium, Jupiter, etc. via @wallet-standard/wallet
 */

import EventEmitter from "eventemitter3";
import { OKO_WALLET_NAME, OKO_ICON } from "@/shared/constants";
import { sendToBackground } from "./bridge";
import type {
  Wallet,
  WalletAccount,
  WalletIcon,
  IdentifierString,
} from "@wallet-standard/base";
import type {
  StandardConnectFeature,
  StandardConnectMethod,
  StandardDisconnectFeature,
  StandardDisconnectMethod,
  StandardEventsFeature,
  StandardEventsListeners,
  StandardEventsNames,
  StandardEventsOnMethod,
} from "@wallet-standard/features";

// Solana-specific feature identifiers
const SolanaSignMessage = "solana:signMessage" as const;
const SolanaSignTransaction = "solana:signTransaction" as const;
const SolanaSignAndSendTransaction = "solana:signAndSendTransaction" as const;

// Shared base58 decoder
function base58ToBytes(base58: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes: number[] = [];
  for (let i = 0; i < base58.length; i++) {
    const char = base58[i];
    const value = ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < base58.length && base58[i] === "1"; i++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

// Wallet account for Solana
class OkoSvmWalletAccount implements WalletAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly IdentifierString[];
  readonly features: readonly IdentifierString[];
  readonly label?: string;
  readonly icon?: WalletIcon;

  constructor(publicKey: string, chains: IdentifierString[]) {
    this.address = publicKey;
    this.publicKey = base58ToBytes(publicKey);
    this.chains = chains;
    this.features = [
      SolanaSignMessage,
      SolanaSignTransaction,
      SolanaSignAndSendTransaction,
    ];
    this.label = "Oko Account";
    this.icon = OKO_ICON as WalletIcon;
  }
}

// Event types
type WalletEvent = "change";

export class ExtensionSvmWallet implements Wallet {
  readonly version = "1.0.0" as const;
  readonly name = OKO_WALLET_NAME;
  readonly icon: WalletIcon = OKO_ICON as WalletIcon;
  readonly chains = ["solana:mainnet", "solana:devnet", "solana:testnet"] as const;

  private _accounts: WalletAccount[] = [];
  private _listeners: { [E in StandardEventsNames]?: StandardEventsListeners[E][] } = {};
  private _eventEmitter = new EventEmitter<WalletEvent>();
  private _publicKey: string | null = null;

  constructor() {
    this._initState();
  }

  private async _initState(): Promise<void> {
    try {
      const response = await sendToBackground<{
        isConnected: boolean;
        svmPublicKey: string | null;
      }>("GET_STATE", null);

      if (response.success && response.data?.svmPublicKey) {
        this._publicKey = response.data.svmPublicKey;
        this._updateAccounts();
      }
    } catch (error) {
      console.debug("[oko-svm] Failed to init state:", error);
    }
  }

  get accounts(): readonly WalletAccount[] {
    return this._accounts;
  }

  get features(): Record<string, unknown> {
    return {
      "standard:connect": {
        version: "1.0.0",
        connect: this._connect.bind(this),
      } as StandardConnectFeature["standard:connect"],

      "standard:disconnect": {
        version: "1.0.0",
        disconnect: this._disconnect.bind(this),
      } as StandardDisconnectFeature["standard:disconnect"],

      "standard:events": {
        version: "1.0.0",
        on: this._on.bind(this),
      } as StandardEventsFeature["standard:events"],

      [SolanaSignMessage]: {
        version: "1.0.0",
        signMessage: this._signMessage.bind(this),
      },

      [SolanaSignTransaction]: {
        version: "1.0.0",
        signTransaction: this._signTransaction.bind(this),
      },

      [SolanaSignAndSendTransaction]: {
        version: "1.0.0",
        signAndSendTransaction: this._signAndSendTransaction.bind(this),
      },
    };
  }

  private async _connect(): Promise<{ accounts: readonly WalletAccount[] }> {
    console.debug("[oko-svm] connect");

    const response = await sendToBackground<{ publicKey: string }>(
      "SVM_REQUEST",
      { method: "connect" }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to connect");
    }

    if (response.data?.publicKey) {
      this._publicKey = response.data.publicKey;
      this._updateAccounts();
      this._emit("change", { accounts: this._accounts });
    }

    return { accounts: this._accounts };
  }

  private async _disconnect(): Promise<void> {
    console.debug("[oko-svm] disconnect");

    await sendToBackground("SVM_REQUEST", { method: "disconnect" });

    this._publicKey = null;
    this._accounts = [];
    this._emit("change", { accounts: this._accounts });
  }

  private _on<E extends StandardEventsNames>(
    event: E,
    listener: StandardEventsListeners[E]
  ): () => void {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event]!.push(listener);

    return () => {
      const listeners = this._listeners[event];
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private _emit<E extends StandardEventsNames>(
    event: E,
    ...args: Parameters<StandardEventsListeners[E]>
  ): void {
    const listeners = this._listeners[event];
    if (listeners) {
      for (const listener of listeners) {
        (listener as (...a: unknown[]) => void)(...args);
      }
    }
  }

  private async _signMessage(input: {
    account: WalletAccount;
    message: Uint8Array;
  }): Promise<{ signedMessage: Uint8Array; signature: Uint8Array }> {
    console.debug("[oko-svm] signMessage");

    const response = await sendToBackground<{ signature: number[] }>(
      "SVM_REQUEST",
      {
        method: "signMessage",
        params: {
          message: Array.from(input.message),
        },
      }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to sign message");
    }

    const signature = new Uint8Array(response.data?.signature || []);
    return {
      signedMessage: input.message,
      signature,
    };
  }

  private async _signTransaction(input: {
    account: WalletAccount;
    transaction: Uint8Array;
    chain?: string;
  }): Promise<{ signedTransaction: Uint8Array }> {
    console.debug("[oko-svm] signTransaction");

    const response = await sendToBackground<{ signedTransaction: number[] }>(
      "SVM_REQUEST",
      {
        method: "signTransaction",
        params: {
          transaction: Array.from(input.transaction),
          chain: input.chain,
        },
      }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to sign transaction");
    }

    return {
      signedTransaction: new Uint8Array(response.data?.signedTransaction || []),
    };
  }

  private async _signAndSendTransaction(input: {
    account: WalletAccount;
    transaction: Uint8Array;
    chain?: string;
  }): Promise<{ signature: Uint8Array }> {
    console.debug("[oko-svm] signAndSendTransaction");

    const response = await sendToBackground<{ signature: string }>(
      "SVM_REQUEST",
      {
        method: "signAndSendTransaction",
        params: {
          transaction: Array.from(input.transaction),
          chain: input.chain,
        },
      }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to sign and send transaction");
    }

    // Convert base58 signature to bytes
    const signatureBytes = base58ToBytes(response.data?.signature || "");
    return { signature: signatureBytes };
  }

  private _updateAccounts(): void {
    if (this._publicKey) {
      this._accounts = [
        new OkoSvmWalletAccount(this._publicKey, [...this.chains]),
      ];
    } else {
      this._accounts = [];
    }
  }
}
