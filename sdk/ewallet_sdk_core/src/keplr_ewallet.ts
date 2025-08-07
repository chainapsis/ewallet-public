import { sendMsgToIframe } from "./window_msg/send_msg_to_iframe";
import { showModal } from "./api/show_modal";
import { signIn } from "./api/sign_in";
import { signOut } from "./api/sign_out";
import { getPublicKey } from "./api/get_public_key";
import { getEmail } from "./api/get_email";
import { hideModal } from "./api/hide_modal";
import { makeSignature } from "./api/make_signature";
import { initState } from "./api/init_state";

export class KeplrEWallet {
  customerId: string;
  iframe: HTMLIFrameElement;
  sdkEndpoint: string;
  readonly origin: string;

  public constructor(
    customerId: string,
    iframe: HTMLIFrameElement,
    sdkEndpoint: string,
  ) {
    this.customerId = customerId;
    this.iframe = iframe;
    this.sdkEndpoint = sdkEndpoint;
    this.origin = window.location.origin;
  }

  showModal = showModal.bind(this);
  hideModal = hideModal.bind(this);
  sendMsgToIframe = sendMsgToIframe.bind(this);
  signIn = signIn.bind(this);
  signOut = signOut.bind(this);
  getPublicKey = getPublicKey.bind(this);
  getEmail = getEmail.bind(this);
  makeSignature = makeSignature.bind(this);
  initState = initState.bind(this);
}
