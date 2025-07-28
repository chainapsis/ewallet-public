import type { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import { type Hex } from "viem";
import { publicKeyToAddress } from "viem/accounts";
import { base, mainnet, optimism } from "viem/chains";

import type { EIP1193Provider } from "@keplr-ewallet-sdk-eth/provider";
import type { IEthEWallet } from "@keplr-ewallet-sdk-eth/types";
import {
  getPublicKey,
  makeSignature,
  getEthereumProvider,
  personalSign,
  switchChain,
} from "@keplr-ewallet-sdk-eth/api";

const SUPPORTED_CHAINS = [mainnet, base, optimism];

export class EthEWallet implements IEthEWallet {
  readonly eWallet: KeplrEWallet;
  private _cachedProvider: EIP1193Provider | null = null;
  private _address: Hex | null = null;
  private _activeChainId: number = 1; // TODO: get active chain id from ewallet
  private readonly _chains = SUPPORTED_CHAINS;

  constructor(eWallet: KeplrEWallet) {
    this.eWallet = eWallet;
  }

  async initialize(): Promise<void> {
    if (this._address === null) {
      const publicKey = await this.getPublicKey();
      this._address = publicKeyToAddress(publicKey);
    }

    // TODO: get supported chains from keplr registry
  }

  get type(): "ethereum" {
    return "ethereum";
  }

  get chainId(): `eip155:${number}` {
    return `eip155:${this._activeChainId}`;
  }

  get address(): Hex {
    if (this._address === null) {
      throw new Error("EthEWallet not initialized. Call initialize() first.");
    }
    return this._address;
  }

  protected get cachedProvider(): EIP1193Provider | null {
    return this._cachedProvider;
  }

  protected set cachedProvider(provider: EIP1193Provider | null) {
    this._cachedProvider = provider;
  }

  protected get activeChainId(): number {
    return this._activeChainId;
  }

  protected set activeChainId(chainId: number) {
    this._activeChainId = chainId;
  }

  protected get chains() {
    return this._chains;
  }

  getEthereumProvider = getEthereumProvider.bind(this);
  sign = personalSign.bind(this);
  switchChain = switchChain.bind(this);
  protected getPublicKey = getPublicKey.bind(this);
  protected makeSignature = makeSignature.bind(this);
}
