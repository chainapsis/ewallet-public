import type { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import type { Address, Chain, Hex } from "viem";

import type { EIP1193Provider } from "@keplr-ewallet-sdk-eth/provider";
import {
  getPublicKey,
  makeSignature,
  getEthereumProvider,
  personalSign,
  switchChain,
  toViemAccount,
  getAddress,
} from "@keplr-ewallet-sdk-eth/api";
import { SUPPORTED_CHAINS } from "@keplr-ewallet-sdk-eth/chains";

export class EthEWallet {
  readonly eWallet: KeplrEWallet;
  private _provider: EIP1193Provider | null;
  private _publicKey: Hex | null;
  private _address: Address | null;
  private _activeChainId: number;
  private readonly _chains: Chain[];

  constructor(eWallet: KeplrEWallet) {
    this.eWallet = eWallet;
    this._provider = null;
    this._publicKey = null;
    this._address = null;
    this._activeChainId = 1;
    this._chains = SUPPORTED_CHAINS;
  }

  get type(): "ethereum" {
    return "ethereum";
  }

  get chainId(): `eip155:${number}` {
    return `eip155:${this._activeChainId}`;
  }

  get publicKey(): Hex | null {
    return this._publicKey;
  }

  protected set publicKey(publicKey: Hex) {
    this._publicKey = publicKey;
  }

  get address(): Address | null {
    return this._address;
  }

  protected set address(address: Address) {
    this._address = address;
  }

  get provider(): EIP1193Provider | null {
    return this._provider;
  }

  protected set provider(provider: EIP1193Provider | null) {
    this._provider = provider;
  }

  get activeChainId(): number {
    return this._activeChainId;
  }

  protected set activeChainId(chainId: number) {
    this._activeChainId = chainId;
  }

  get activeChain(): Chain | undefined {
    return this._chains.find((chain) => chain.id === this._activeChainId);
  }

  get chains() {
    return this._chains;
  }

  getEthereumProvider = getEthereumProvider.bind(this);
  sign = personalSign.bind(this);
  switchChain = switchChain.bind(this);
  toViemAccount = toViemAccount.bind(this);
  getPublicKey = getPublicKey.bind(this);
  getAddress = getAddress.bind(this);
  protected makeSignature = makeSignature.bind(this);
}
