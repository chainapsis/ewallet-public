import { sendMsgToIframe } from "./window_msg";
import { showModal } from "./api/show_modal";
import { signIn } from "./api/sign_in";
import { signOut } from "./api/sign_out";
import { getPublicKey } from "./api/get_public_key";
import { getEmail } from "./api/get_email";
import { hideModal } from "./api/hide_modal";
// import { getCosmosChainInfo } from "./api/get_cosmos_chain_info";

export class KeplrEWallet {
  customerId: string; // CHECK: would be better to name it appId?
  iframe: HTMLIFrameElement;
  attachedEndpoint: string;
  origin: string;

  public constructor(
    customerId: string,
    iframe: HTMLIFrameElement,
    attachedEndpoint: string,
  ) {
    this.customerId = customerId;
    this.iframe = iframe;
    this.attachedEndpoint = attachedEndpoint;
    this.origin = window.location.origin;
  }

  showModal = showModal.bind(this);
  hideModal = hideModal.bind(this);
  sendMsgToIframe = sendMsgToIframe.bind(this);
  signIn = signIn.bind(this);
  signOut = signOut.bind(this);
  getPublicKey = getPublicKey.bind(this);
  getEmail = getEmail.bind(this);
  // getCosmosChainInfo = getCosmosChainInfo.bind(this);
}
