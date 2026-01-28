/**
 * Cosmos Provider - Keplr-compatible provider for Cosmos dApps
 *
 * Uses OkoCosmosWallet from SDK with ExtensionOkoWallet for communication.
 */

import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";
import type { OkoCosmosWalletInterface } from "@oko-wallet/oko-sdk-cosmos";
import type { Key, ChainInfo, StdSignDoc } from "@keplr-wallet/types";
import { ExtensionOkoWallet } from "./extension-oko-wallet";
import { OKO_ATTACHED_URL, OKO_API_KEY } from "@/shared/constants";

// Keplr-compatible types
interface KeplrSignOptions {
  preferNoSetFee?: boolean;
  preferNoSetMemo?: boolean;
  disableBalanceCheck?: boolean;
}

interface AminoSignResponse {
  signed: StdSignDoc;
  signature: {
    pub_key: { type: string; value: string };
    signature: string;
  };
}

interface SignDoc {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  chainId: string;
  accountNumber: bigint;
}

interface DirectSignResponse {
  signed: SignDoc;
  signature: {
    pub_key: { type: string; value: string };
    signature: string;
  };
}

interface StdSignature {
  pub_key: { type: string; value: string };
  signature: string;
}

export class ExtensionCosmosProvider {
  readonly version = "0.12.0";
  readonly mode = "extension";
  readonly isOko = true;
  readonly defaultOptions = {
    sign: {
      preferNoSetFee: false,
      preferNoSetMemo: false,
      disableBalanceCheck: false,
    },
  };

  private _cosmosWallet: OkoCosmosWalletInterface | null = null;
  private _initPromise: Promise<void> | null = null;

  constructor() {
    // Lazy initialization
  }

  private async _ensureInitialized(): Promise<OkoCosmosWalletInterface> {
    if (this._cosmosWallet) {
      return this._cosmosWallet;
    }

    if (!this._initPromise) {
      this._initPromise = this._init();
    }

    await this._initPromise;
    return this._cosmosWallet!;
  }

  private async _init(): Promise<void> {
    const extensionWallet = new ExtensionOkoWallet(
      OKO_API_KEY,
      OKO_ATTACHED_URL
    );

    await extensionWallet.waitUntilInitialized;

    // OkoCosmosWallet constructor returns instance but types say void - need cast
    const cosmosWallet = new OkoCosmosWallet(extensionWallet) as unknown as OkoCosmosWalletInterface;
    await cosmosWallet.waitUntilInitialized;
    this._cosmosWallet = cosmosWallet;
  }

  async enable(chainIds: string | string[]): Promise<void> {
    const wallet = await this._ensureInitialized();
    const chains = Array.isArray(chainIds) ? chainIds : [chainIds];
    // Enable each chain
    for (const chainId of chains) {
      await wallet.enable(chainId);
    }
  }

  async getKey(chainId: string): Promise<Key> {
    const wallet = await this._ensureInitialized();
    return wallet.getKey(chainId);
  }

  async getKeysSettled(
    chainIds: string[]
  ): Promise<Array<{ status: string; value?: Key; reason?: unknown }>> {
    const wallet = await this._ensureInitialized();
    return wallet.getKeysSettled(chainIds);
  }

  async signAmino(
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions?: KeplrSignOptions
  ): Promise<AminoSignResponse> {
    const wallet = await this._ensureInitialized();
    return wallet.signAmino(chainId, signer, signDoc, signOptions);
  }

  async signDirect(
    chainId: string,
    signer: string,
    signDoc: SignDoc,
    signOptions?: KeplrSignOptions
  ): Promise<DirectSignResponse> {
    const wallet = await this._ensureInitialized();
    return wallet.signDirect(chainId, signer, signDoc as any, signOptions);
  }

  async signArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array
  ): Promise<StdSignature> {
    const wallet = await this._ensureInitialized();
    return wallet.signArbitrary(chainId, signer, data);
  }

  async verifyArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    signature: StdSignature
  ): Promise<boolean> {
    const wallet = await this._ensureInitialized();
    const result = await wallet.verifyArbitrary(chainId, signer, data, signature);
    return result.isVerified;
  }

  async sendTx(
    chainId: string,
    tx: Uint8Array,
    mode: "async" | "sync" | "block"
  ): Promise<Uint8Array> {
    const wallet = await this._ensureInitialized();
    return wallet.sendTx(chainId, tx, mode);
  }

  async experimentalSuggestChain(chainInfo: ChainInfo): Promise<void> {
    const wallet = await this._ensureInitialized();
    return wallet.experimentalSuggestChain(chainInfo);
  }

  getOfflineSigner(chainId: string, signOptions?: KeplrSignOptions) {
    // Return a signer that will initialize the wallet when used
    return {
      getAccounts: async () => {
        const wallet = await this._ensureInitialized();
        return wallet.getOfflineSigner(chainId, signOptions).getAccounts();
      },
      signDirect: async (signerAddress: string, signDoc: any) => {
        const wallet = await this._ensureInitialized();
        return wallet
          .getOfflineSigner(chainId, signOptions)
          .signDirect(signerAddress, signDoc);
      },
    };
  }

  getOfflineSignerOnlyAmino(chainId: string, signOptions?: KeplrSignOptions) {
    return {
      getAccounts: async () => {
        const wallet = await this._ensureInitialized();
        return wallet
          .getOfflineSignerOnlyAmino(chainId, signOptions)
          .getAccounts();
      },
      signAmino: async (signerAddress: string, signDoc: any) => {
        const wallet = await this._ensureInitialized();
        return wallet
          .getOfflineSignerOnlyAmino(chainId, signOptions)
          .signAmino(signerAddress, signDoc);
      },
    };
  }

  async getOfflineSignerAuto(chainId: string, signOptions?: KeplrSignOptions) {
    const wallet = await this._ensureInitialized();
    return wallet.getOfflineSignerAuto(chainId, signOptions);
  }
}
