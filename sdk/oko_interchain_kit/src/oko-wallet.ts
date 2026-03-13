import type {
  BroadcastMode,
  SignOptions,
  StdSignature,
  Wallet,
  WalletAccount,
} from "@interchain-kit/core";
import { CosmosWallet } from "@interchain-kit/core";
import type { OkoCosmosWalletInterface } from "@oko-wallet/oko-sdk-cosmos";

/**
 * Oko Cosmos Wallet implementation for interchain-kit
 */
export class OkoWallet extends CosmosWallet {
  private okoClient: OkoCosmosWalletInterface;
  defaultSignOptions: {
    preferNoSetFee: boolean;
    preferNoSetMemo: boolean;
    disableBalanceCheck: boolean;
  } = {
    preferNoSetFee: false,
    preferNoSetMemo: false,
    disableBalanceCheck: false,
  };

  constructor(walletInfo: Wallet, okoClient: OkoCosmosWalletInterface) {
    super(walletInfo);
    this.okoClient = okoClient;

    // Expose client for interchain-kit
    (this as any).client = okoClient;
  }

  setSignOptions(options: SignOptions): void {
    this.defaultSignOptions = {
      ...this.defaultSignOptions,
      ...options,
    };
  }

  async init(): Promise<void> {
    await this.okoClient.waitUntilInitialized;
  }

  async connect(_chainId: string): Promise<void> {}

  async disconnect(_chainId: string): Promise<void> {
    await this.okoClient.okoWallet.signOut();
  }

  async getAccount(chainId: string): Promise<WalletAccount> {
    // Check if user is already signed in
    const publicKey = await this.okoClient.okoWallet.getPublicKey();

    // If not signed in, trigger the sign-in flow
    if (!publicKey) {
      await this.okoClient.okoWallet.openSignInModal();
    }

    const key = await this.okoClient.getKey(chainId);

    // Normalize pubkey to a plain Uint8Array.
    // key.pubKey may be a Buffer, a deserialized {type:"Buffer",data:[...]}
    // object, or already a Uint8Array.
    let raw: Uint8Array;
    const pk = key.pubKey as any;
    if (
      pk &&
      typeof pk === "object" &&
      pk.type === "Buffer" &&
      Array.isArray(pk.data)
    ) {
      raw = new Uint8Array(pk.data);
    } else {
      raw = new Uint8Array(pk);
    }

    return {
      username: key.name,
      address: key.bech32Address,
      algo: key.algo as any,
      pubkey: raw,
      isNanoLedger: key.isNanoLedger,
    };
  }

  async getOfflineSigner(chainId: string): Promise<any> {
    return this.okoClient.getOfflineSigner(chainId);
  }

  async signAmino(
    chainId: string,
    signer: string,
    signDoc: any,
    _signOptions?: any,
  ): Promise<any> {
    return this.okoClient.signAmino(chainId, signer, signDoc);
  }

  async signArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
  ): Promise<StdSignature> {
    return await this.okoClient.signArbitrary(chainId, signer, data);
  }

  async signDirect(
    chainId: string,
    signer: string,
    signDoc: any,
    _signOptions?: any,
  ): Promise<any> {
    return this.okoClient.signDirect(chainId, signer, signDoc);
  }

  async sendTx(chainId: string, tx: Uint8Array, mode: BroadcastMode) {
    return await this.okoClient.sendTx(chainId, tx, mode);
  }

  async addSuggestChain(_chainId: string): Promise<void> {}
}
