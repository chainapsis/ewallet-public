import { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import type { ChainInfo } from "@keplr-wallet/types";

import {
  enable,
  experimentalSuggestChain,
  getAccounts,
  getKey,
  getKeysSettled,
  getOfflineSigner,
  getOfflineSignerAuto,
  getOfflineSignerOnlyAmino,
  sendTx,
  signAmino,
  signArbitrary,
  signDirect,
  verifyArbitrary,
  showModal,
  makeSignature,
} from "@keplr-ewallet-sdk-cosmos/api";

const CACHE_TIME = 1000 * 60 * 60 * 1;

export class CosmosEWallet {
  eWallet: KeplrEWallet;
  private _cosmosChainInfo: ChainInfo[] | null = null;
  private _cacheTime: number = 0;

  constructor(eWallet: KeplrEWallet) {
    this.eWallet = eWallet;
  }

  protected async getPublicKey(): Promise<Uint8Array> {
    try {
      const pubKey = await this.eWallet.getPublicKey();
      if (pubKey === null) {
        throw new Error("Failed to get public key");
      }

      return Buffer.from(pubKey, "hex");
    } catch (error) {
      console.error("[cosmos] getPublicKey failed with error:", error);
      throw error;
    }
  }

  protected async getCosmosChainInfo(): Promise<ChainInfo[]> {
    const isCacheExpired = Date.now() - this._cacheTime > CACHE_TIME;
    if (isCacheExpired || this._cosmosChainInfo === null) {
      const chainInfoRes = await this.eWallet.getCosmosChainInfo();

      if (!chainInfoRes) {
        throw new Error("Failed to get chain registry response");
      }

      if (!chainInfoRes.success) {
        throw new Error(chainInfoRes.error);
      }

      this._cosmosChainInfo = chainInfoRes.data;

      const newMap = new Map<string, ChainInfo>();
      for (const chainInfo of this._cosmosChainInfo) {
        if (
          chainInfo.bech32Config?.bech32PrefixAccAddr &&
          chainInfo.bech32Config?.bech32PrefixAccAddr.length > 0
        ) {
          newMap.set(chainInfo.bech32Config?.bech32PrefixAccAddr, chainInfo);
        }
      }

      this._cacheTime = Date.now();
    }

    return this._cosmosChainInfo;
  }

  enable = enable;
  experimentalSuggestChain = experimentalSuggestChain;
  getAccounts = getAccounts.bind(this);
  getOfflineSigner = getOfflineSigner.bind(this);
  getOfflineSignerOnlyAmino = getOfflineSignerOnlyAmino.bind(this);
  getOfflineSignerAuto = getOfflineSignerAuto.bind(this);
  getKey = getKey.bind(this);
  getKeysSettled = getKeysSettled.bind(this);
  sendTx = sendTx.bind(this);
  signAmino = signAmino.bind(this);
  signDirect = signDirect.bind(this);
  signArbitrary = signArbitrary.bind(this);
  verifyArbitrary = verifyArbitrary.bind(this);
  protected showModal = showModal.bind(this);
  protected makeSignature = makeSignature.bind(this);
}
