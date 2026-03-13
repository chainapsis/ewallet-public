import { OkoCosmosWallet } from "./constructor";
import { init } from "./static/init";
import { enable } from "@oko-wallet-sdk-cosmos/methods/enable";
import { experimentalSuggestChain } from "@oko-wallet-sdk-cosmos/methods/experimental_suggest_chain";
import { getAccounts } from "@oko-wallet-sdk-cosmos/methods/get_accounts";
import { getCosmosChainInfo } from "@oko-wallet-sdk-cosmos/methods/get_cosmos_chain_info";
import { getKey } from "@oko-wallet-sdk-cosmos/methods/get_key";
import { getKeysSettled } from "@oko-wallet-sdk-cosmos/methods/get_keys_settled";
import { getOfflineSigner } from "@oko-wallet-sdk-cosmos/methods/get_offline_signer";
import { getOfflineSignerAuto } from "@oko-wallet-sdk-cosmos/methods/get_offline_signer_auto";
import { getOfflineSignerOnlyAmino } from "@oko-wallet-sdk-cosmos/methods/get_offline_signer_only_amino";
import { getPublicKey } from "@oko-wallet-sdk-cosmos/methods/get_public_key";
import { on } from "@oko-wallet-sdk-cosmos/methods/on";
import { openModal } from "@oko-wallet-sdk-cosmos/methods/open_modal";
import { sendTx } from "@oko-wallet-sdk-cosmos/methods/send_tx";
import { signAmino } from "@oko-wallet-sdk-cosmos/methods/sign_amino";
import { signArbitrary } from "@oko-wallet-sdk-cosmos/methods/sign_arbitrary";
import { signDirect } from "@oko-wallet-sdk-cosmos/methods/sign_direct";
import { verifyArbitrary } from "@oko-wallet-sdk-cosmos/methods/verify_arbitrary";
import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";

OkoCosmosWallet.init = init;

const ptype: OkoCosmosWalletInterface = OkoCosmosWallet.prototype;

ptype.enable = enable;
ptype.on = on;
ptype.getPublicKey = getPublicKey;
ptype.getCosmosChainInfo = getCosmosChainInfo;
ptype.experimentalSuggestChain = experimentalSuggestChain;
ptype.getAccounts = getAccounts;
ptype.getOfflineSigner = getOfflineSigner;
ptype.getOfflineSignerOnlyAmino = getOfflineSignerOnlyAmino;
ptype.getOfflineSignerAuto = getOfflineSignerAuto;
ptype.getKey = getKey;
ptype.getKeysSettled = getKeysSettled;
ptype.sendTx = sendTx;
ptype.signAmino = signAmino;
ptype.signDirect = signDirect;
ptype.signArbitrary = signArbitrary;
ptype.verifyArbitrary = verifyArbitrary;
ptype.openModal = openModal;

export { OkoCosmosWallet };
