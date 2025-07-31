import { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import { type Result } from "@keplr-ewallet/stdlib-js";

import type { ChainInfo } from "@keplr-wallet/types";

import { enable } from "./api/enable";
import { getCosmosChainInfo } from "./api/get_cosmos_chain_info";
import { getAccounts } from "./api/get_accounts";
import { experimentalSuggestChain } from "./api/experimental_suggest_chain";
import { getKey } from "./api/get_key";
import { getOfflineSigner } from "./api/get_offline_signer";
import { getOfflineSignerOnlyAmino } from "./api/get_offline_signer_only_amino";
import { getOfflineSignerAuto } from "./api/get_offline_signer_auto";
import { getKeysSettled } from "./api/get_keys_settled";
import { sendTx } from "./api/send_tx";
import { signAmino } from "./api/sign_amino";
import { signDirect } from "./api/sign_direct";
import { signArbitrary } from "./api/sign_arbitrary";
import { verifyArbitrary } from "./api/verify_arbitrary";
import { showModal } from "./api/show_modal";
import { makeSignature } from "./api/make_signature";
import { getPublicKey } from "./api/get_public_key";

export class CosmosEWallet {
  public eWallet: KeplrEWallet;
  protected _cosmosChainInfo: ChainInfo[] | null = null;
  protected _cacheTime: number = 0;

  constructor(eWallet: KeplrEWallet) {
    this.eWallet = eWallet;
  }

  enable = enable.bind(this);
  getPublicKey = getPublicKey.bind(this);
  getCosmosChainInfo = getCosmosChainInfo.bind(this);
  experimentalSuggestChain = experimentalSuggestChain.bind(this);
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
