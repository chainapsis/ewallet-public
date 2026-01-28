/**
 * SVM Provider - Wallet Standard compatible wallet for Solana dApps
 *
 * Uses OkoSvmWallet and OkoStandardWallet from SDK with ExtensionOkoWallet
 * for communication with background service worker.
 */

import { OkoSvmWallet, OkoStandardWallet } from "@oko-wallet/oko-sdk-svm";
import type { WalletStandardConfig, OkoSvmWalletInterface } from "@oko-wallet/oko-sdk-svm";
import type { Wallet, WalletAccount, WalletIcon, IdentifierString } from "@wallet-standard/base";
import type { StandardEventsListeners, StandardEventsNames } from "@wallet-standard/features";
import { ExtensionOkoWallet } from "./extension-oko-wallet";
import { OKO_ATTACHED_URL, OKO_API_KEY, OKO_ICON } from "@/shared/constants";

// Default Solana chain configurations for Wallet Standard
const DEFAULT_SVM_CONFIGS: WalletStandardConfig[] = [
  {
    chains: ["solana:mainnet", "solana:devnet", "solana:testnet"],
    features: {
      signIn: "solana:signIn",
      signMessage: "solana:signMessage",
      signTransaction: "solana:signTransaction",
      signAndSendTransaction: "solana:signAndSendTransaction",
    },
    rpcEndpoints: {
      "solana:mainnet": "https://api.mainnet-beta.solana.com",
      "solana:devnet": "https://api.devnet.solana.com",
      "solana:testnet": "https://api.testnet.solana.com",
    },
  },
];

/**
 * Extension SVM wallet that implements Wallet Standard
 * Wraps OkoSvmWallet and OkoStandardWallet from SDK
 */
export class ExtensionSvmWallet implements Wallet {
  private _standardWallet: OkoStandardWallet | null = null;
  private _svmWallet: OkoSvmWalletInterface | null = null;
  private _extensionWallet: ExtensionOkoWallet | null = null;
  private _initPromise: Promise<void> | null = null;
  private _listeners: { [E in StandardEventsNames]?: StandardEventsListeners[E][] } = {};

  // Wallet Standard required properties
  readonly version = "1.0.0" as const;
  readonly name = "Oko" as const;
  readonly icon: WalletIcon = OKO_ICON as WalletIcon;
  readonly chains: readonly IdentifierString[] = [
    "solana:mainnet",
    "solana:devnet",
    "solana:testnet",
  ];

  get accounts(): readonly WalletAccount[] {
    return this._standardWallet?.accounts ?? [];
  }

  get features(): Record<string, unknown> {
    // Return basic features that trigger initialization when used
    return {
      "standard:connect": {
        version: "1.0.0" as const,
        connect: async () => {
          const wallet = await this._ensureInitialized();
          const features = wallet.features;
          const connect = features["standard:connect"] as {
            connect: () => Promise<{ accounts: readonly WalletAccount[] }>;
          };
          return connect.connect();
        },
      },
      "standard:disconnect": {
        version: "1.0.0" as const,
        disconnect: async () => {
          if (this._standardWallet) {
            const features = this._standardWallet.features;
            const disconnect = features["standard:disconnect"] as {
              disconnect: () => Promise<void>;
            };
            await disconnect.disconnect();
          }
        },
      },
      "standard:events": {
        version: "1.0.0" as const,
        on: this._on.bind(this),
      },
      "solana:signMessage": {
        version: "1.0.0" as const,
        signMessage: async (input: unknown) => {
          const wallet = await this._ensureInitialized();
          const features = wallet.features;
          const signMessage = features["solana:signMessage"] as {
            signMessage: (input: unknown) => Promise<unknown>;
          };
          return signMessage.signMessage(input);
        },
      },
      "solana:signTransaction": {
        version: "1.0.0" as const,
        signTransaction: async (input: unknown) => {
          const wallet = await this._ensureInitialized();
          const features = wallet.features;
          const signTransaction = features["solana:signTransaction"] as {
            signTransaction: (input: unknown) => Promise<unknown>;
          };
          return signTransaction.signTransaction(input);
        },
      },
      "solana:signAndSendTransaction": {
        version: "1.0.0" as const,
        signAndSendTransaction: async (input: unknown) => {
          const wallet = await this._ensureInitialized();
          const features = wallet.features;
          const signAndSendTransaction = features["solana:signAndSendTransaction"] as {
            signAndSendTransaction: (input: unknown) => Promise<unknown>;
          };
          return signAndSendTransaction.signAndSendTransaction(input);
        },
      },
    };
  }

  constructor() {
    // Start initialization in background
    this._initState();
  }

  private async _ensureInitialized(): Promise<OkoStandardWallet> {
    if (this._standardWallet) {
      return this._standardWallet;
    }

    if (!this._initPromise) {
      this._initPromise = this._init();
    }

    await this._initPromise;
    return this._standardWallet!;
  }

  private async _init(): Promise<void> {
    const extensionWallet = new ExtensionOkoWallet(OKO_API_KEY, OKO_ATTACHED_URL);
    await extensionWallet.waitUntilInitialized;
    this._extensionWallet = extensionWallet;

    // OkoSvmWallet constructor returns instance but types say undefined - need cast
    const svmWallet = new OkoSvmWallet(extensionWallet) as unknown as OkoSvmWalletInterface;
    await svmWallet.waitUntilInitialized;
    this._svmWallet = svmWallet;

    this._standardWallet = new OkoStandardWallet(svmWallet, DEFAULT_SVM_CONFIGS);

    // Forward events from internal wallet
    svmWallet.on("connect", () => this._emit("change", { accounts: this.accounts }));
    svmWallet.on("disconnect", () => this._emit("change", { accounts: [] }));
    svmWallet.on("accountChanged", () => this._emit("change", { accounts: this.accounts }));
  }

  private async _initState(): Promise<void> {
    try {
      await this._ensureInitialized();
    } catch (error) {
      console.debug("[oko-svm] Failed to init state:", error);
    }
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
}
