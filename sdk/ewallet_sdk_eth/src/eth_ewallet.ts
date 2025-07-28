import type { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import type { Address, Chain, Hex } from "viem";
import { publicKeyToAddress } from "viem/accounts";
import {
  arbitrum,
  avalanche,
  base,
  berachain,
  blast,
  citreaTestnet,
  forma,
  mainnet,
  optimism,
  polygon,
  sepolia,
  unichain,
} from "viem/chains";

import type { EIP1193Provider } from "@keplr-ewallet-sdk-eth/provider";
import {
  getPublicKey,
  makeSignature,
  getEthereumProvider,
  personalSign,
  switchChain,
  toViemAccount,
} from "@keplr-ewallet-sdk-eth/api";

const SUPPORTED_CHAINS = [
  mainnet,
  base,
  optimism,
  arbitrum,
  blast,
  avalanche,
  unichain,
  polygon,
  forma,
  berachain,
  sepolia,
  citreaTestnet,
];

export class EthEWallet {
  readonly eWallet: KeplrEWallet;
  private _cachedProvider: EIP1193Provider | null;
  private _address: Address | null;
  private _activeChainId: number;
  private readonly _chains: Chain[];

  constructor(eWallet: KeplrEWallet) {
    this.eWallet = eWallet;
    this._cachedProvider = null;
    this._address = null;
    this._activeChainId = 1;
    this._chains = SUPPORTED_CHAINS;
  }

  async initialize(initialChainId?: Hex | number): Promise<void> {
    const isInitialized =
      this._address !== null && this._cachedProvider !== null;
    if (isInitialized) {
      return;
    }

    const publicKey = await this.getPublicKey();
    this._address = publicKeyToAddress(publicKey);

    const provider = await this.getEthereumProvider();
    this.cachedProvider = provider;

    if (initialChainId) {
      try {
        await this.switchChain(initialChainId);
      } catch (error) {
        console.error("Failed to switch chain", error);
      }
    }
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
    return this._address;
  }

  get cachedProvider(): EIP1193Provider | null {
    return this._cachedProvider;
  }

  protected set cachedProvider(provider: EIP1193Provider | null) {
    this._cachedProvider = provider;
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
  protected getPublicKey = getPublicKey.bind(this);
  protected makeSignature = makeSignature.bind(this);
}
