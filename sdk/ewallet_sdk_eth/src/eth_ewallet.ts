import type { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import { type Address } from "viem";
import { publicKeyToAddress } from "viem/accounts";
import { base, mainnet, optimism } from "viem/chains";

import type { EIP1193Provider } from "@keplr-ewallet-sdk-eth/provider";
import {
  getPublicKey,
  makeSignature,
  getEthereumProvider,
  personalSign,
  switchChain,
  toViemAccount,
} from "@keplr-ewallet-sdk-eth/api";

const SUPPORTED_CHAINS = [mainnet, base, optimism];

export class EthEWallet {
  readonly eWallet: KeplrEWallet;
  private _cachedProvider: EIP1193Provider | null;
  private _address: Address | null;

  // TODO: get active chain id from ewallet
  private _activeChainId: number;
  private readonly _chains;

  constructor(eWallet: KeplrEWallet) {
    this.eWallet = eWallet;
    this._cachedProvider = null;
    this._address = null;
    this._activeChainId = 1;
    this._chains = SUPPORTED_CHAINS;
  }

  async initialize(initialChainId?: string | number): Promise<void> {
    // check if already initialized
    if (this._address !== null) {
      return;
    }

    const publicKey = await this.getPublicKey();
    this._address = publicKeyToAddress(publicKey);

    // init provider with initial chain id
  }

  get type(): "ethereum" {
    return "ethereum";
  }

  get chainId(): `eip155:${number}` {
    return `eip155:${this._activeChainId}`;
  }

  get address(): Address {
    if (this._address === null) {
      throw new Error("EthEWallet not initialized. Call initialize() first.");
    }
    return this.address;
  }

  get cachedProvider(): EIP1193Provider | null {
    return this._cachedProvider;
  }

  set cachedProvider(provider: EIP1193Provider | null) {
    this._cachedProvider = provider;
  }

  get activeChainId(): number {
    return this._activeChainId;
  }

  set activeChainId(chainId: number) {
    this._activeChainId = chainId;
  }

  get chains() {
    return this._chains;
  }

  getEthereumProvider = getEthereumProvider.bind(this);
  sign = personalSign.bind(this);
  switchChain = switchChain.bind(this);
  toViemAccount = toViemAccount.bind(this);
  protected getPublicKey = getPublicKey.bind(this);
  protected makeSignature = makeSignature.bind(this);
}
