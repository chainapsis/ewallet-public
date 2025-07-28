import type { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import { type Hex, isAddress, toHex } from "viem";
import { publicKeyToAddress } from "viem/accounts";
import { base, mainnet, optimism } from "viem/chains";
import { v4 as uuidv4 } from "uuid";

import { makeGetPublicKey, makeSign } from "@keplr-ewallet-sdk-eth/api";
import {
  initEWalletEIP1193Provider,
  type EIP1193Provider,
} from "@keplr-ewallet-sdk-eth/provider";
import type { IEthEWallet, SignFunction } from "@keplr-ewallet-sdk-eth/types";

const SUPPORTED_CHAINS = [mainnet, base, optimism];

export interface InitEthEWalletArgs {
  eWallet: KeplrEWallet | null;
}

export class EthEWallet implements IEthEWallet {
  eWallet: KeplrEWallet;
  private _cachedProvider: EIP1193Provider | null = null;
  private _address: Hex | null = null;
  private _activeChainId: number = 1; // TODO: get active chain id from ewallet
  private readonly _chains = SUPPORTED_CHAINS;
  private _signFunction: SignFunction;
  private _getPublicKey: () => Promise<Hex>;

  constructor(eWallet: KeplrEWallet) {
    this.eWallet = eWallet;
    this._signFunction = makeSign(eWallet);
    this._getPublicKey = makeGetPublicKey(eWallet);
  }

  async initialize(): Promise<void> {
    if (this._address === null) {
      const publicKey = await this._getPublicKey();
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

  async getEthereumProvider(): Promise<EIP1193Provider> {
    if (this._cachedProvider !== null) {
      return this._cachedProvider;
    }

    // initial chain should be added first, as first chain is active by default on init provider
    const activeChain =
      this._chains.find((chain) => chain.id === this._activeChainId) ??
      this._chains[0];

    const addEthereumChainParameters = [
      activeChain,
      ...this._chains.filter((chain) => chain.id !== this._activeChainId),
    ].map((chain) => ({
      chainId: toHex(chain.id),
      chainName: chain.name,
      rpcUrls: chain.rpcUrls.default.http,
      nativeCurrency: chain.nativeCurrency,
      blockExplorerUrls: chain.blockExplorers?.default.url
        ? [chain.blockExplorers.default.url]
        : [],
    }));

    const providerId = uuidv4();
    const hasSigner = isAddress(this.address);

    if (hasSigner) {
      const sign = this._signFunction;
      this._cachedProvider = await initEWalletEIP1193Provider({
        id: providerId,
        signer: {
          sign,
          address: this.address,
        },
        chains: addEthereumChainParameters,
      });
    } else {
      // if signer is not available, only handle public rpc requests
      this._cachedProvider = await initEWalletEIP1193Provider({
        id: providerId,
        chains: addEthereumChainParameters,
      });
    }

    return this._cachedProvider;
  }

  async sign(message: string): Promise<Hex> {
    const result = await this._signFunction<"personal_sign">({
      type: "personal_sign",
      data: {
        address: this.address,
        message,
      },
    });

    return result.signature;
  }

  async switchChain(chainId: `0x${string}` | number): Promise<void> {
    const chainIdNumber =
      typeof chainId === "string" ? parseInt(chainId, 16) : chainId;

    const chain = this._chains.find((chain) => chain.id === chainIdNumber);
    if (!chain) {
      throw new Error(`Chain with id ${chainId} not found`);
    }

    this._activeChainId = chainIdNumber;
    // Clear cached provider to force recreation with new chain
    this._cachedProvider = null;
  }
}
