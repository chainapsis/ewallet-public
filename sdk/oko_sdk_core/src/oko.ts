import pJson from "../package.json";
import { sendMsgToIframe } from "./methods/send_msg_to_iframe";
import { openModal } from "./methods/open_modal";
import { openSignInModal } from "./methods/open_sign_in_modal";
import { signIn } from "./methods/sign_in";
import { signOut } from "./methods/sign_out";
import { getPublicKey } from "./methods/get_public_key";
import { getPublicKeyEd25519 } from "./methods/get_public_key_ed25519";
import { getEmail } from "./methods/get_email";
import { getName } from "./methods/get_name";
import { getWalletInfo } from "./methods/get_wallet_info";
import { getAuthType } from "./methods/get_auth_type";
import { closeModal } from "./methods/close_modal";
import { on } from "./methods/on";
import { off } from "./methods/off";
import type { OkoWalletWebInterface } from "./types";
import { init } from "./static/init";
import { OkoWallet } from "./constructor";

OkoWallet.init = init;
OkoWallet.version = pJson.version;

const ptype: OkoWalletWebInterface = OkoWallet.prototype;

ptype.openModal = openModal;
ptype.openSignInModal = openSignInModal;
ptype.closeModal = closeModal;
ptype.sendMsgToIframe = sendMsgToIframe;
ptype.signIn = signIn;
ptype.signOut = signOut;
ptype.getPublicKey = getPublicKey;
ptype.getPublicKeyEd25519 = getPublicKeyEd25519;
ptype.getEmail = getEmail;
ptype.getName = getName;
ptype.getAuthType = getAuthType;
ptype.getWalletInfo = getWalletInfo;
ptype.on = on;
ptype.off = off;

export { OkoWallet };
