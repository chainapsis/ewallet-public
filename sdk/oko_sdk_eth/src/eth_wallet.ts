import { OkoEthWallet } from "./constructor";
import { getAddress } from "./methods/get_address";
import { getEthereumProvider } from "./methods/get_ethereum_provider";
import { getPublicKey } from "./methods/get_public_key";
import { makeSignature } from "./methods/make_signature";
import { personalSign } from "./methods/personal_sign";
import { switchChain } from "./methods/switch_chain";
import { toViemAccount } from "./methods/to_viem_account";
import { init } from "./static/init";
import type { OkoEthWalletInterface } from "./types";

OkoEthWallet.init = init;

const ptype: OkoEthWalletInterface = OkoEthWallet.prototype;

ptype.getEthereumProvider = getEthereumProvider;
ptype.sign = personalSign;
ptype.switchChain = switchChain;
ptype.toViemAccount = toViemAccount;
ptype.getPublicKey = getPublicKey;
ptype.getAddress = getAddress;
ptype.makeSignature = makeSignature;

export { OkoEthWallet };
