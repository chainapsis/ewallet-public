import {
  KeplrEWallet,
  type EWalletMsg,
  type MakeCosmosSigData,
} from "@keplr-ewallet/ewallet-sdk-core";
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

// The chain info itself rarely changes, but just in case
// Set cache time to 4 hours
const CACHE_TIME_FOUR_HOUR = 1000 * 60 * 60 * 4;

export class CosmosEWallet {
  eWallet: KeplrEWallet;
  private _cosmosChainInfoList: ChainInfo[] | null = null;
  private _cosmosChainInfoMapByChainId: Map<string, ChainInfo> | null = null;
  private _cacheTime: number = 0;

  constructor(eWallet: KeplrEWallet) {
    this.eWallet = eWallet;
  }

  protected async getPublicKey(): Promise<Uint8Array> {
    const publicKeyRes = await this.eWallet.sendMsgToIframe({
      msg_type: "get_public_key",
      payload: null,
    });

    if (
      publicKeyRes.msg_type !== "get_public_key_ack" ||
      publicKeyRes.payload === null
    ) {
      throw new Error("Failed to get public key");
    }

    const pubKey = publicKeyRes.payload;
    return Buffer.from(pubKey, "hex");
  }

  protected async getCosmosChainInfoList(): Promise<ChainInfo[]> {
    const isCacheExpired = Date.now() - this._cacheTime > CACHE_TIME_FOUR_HOUR;
    if (
      isCacheExpired ||
      this._cosmosChainInfoList === null ||
      this._cosmosChainInfoMapByChainId === null
    ) {
      const chainRegistryResponse: { chains: ChainInfo[] } | undefined = await (
        await fetch("https://keplr-chain-registry.vercel.app/api/chains")
      ).json();

      if (!chainRegistryResponse) {
        throw new Error("Failed to get chain registry response");
      }

      this._cosmosChainInfoList = chainRegistryResponse.chains;

      const newMap = new Map<string, ChainInfo>();
      for (const chainInfo of this._cosmosChainInfoList) {
        if (
          chainInfo.bech32Config?.bech32PrefixAccAddr &&
          chainInfo.bech32Config?.bech32PrefixAccAddr.length > 0
        ) {
          newMap.set(chainInfo.bech32Config?.bech32PrefixAccAddr, chainInfo);
        }
      }

      this._cacheTime = Date.now();
      this._cosmosChainInfoMapByChainId = newMap;
    }

    return this._cosmosChainInfoList;
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
