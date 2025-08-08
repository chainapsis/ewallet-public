import type { Result } from "@keplr-ewallet/stdlib-js";

import type { ModalResult, ShowModalPayload } from "./modal";
import type { EWalletMakeSignaturePayload, SignOutput } from "./sign";

export type MsgTarget = "keplr_ewallet_attached" | "keplr_ewallet_sdk_core";

export type AckPayload<T> = Result<T, string>;

export type EWalletMsgMakeSignature = {
  target: "keplr_ewallet_attached";
  msg_type: "make_signature";
  payload: EWalletMakeSignaturePayload;
};

export type EWalletMsgMakeSignatureAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "make_signature_ack";
  payload: AckPayload<SignOutput>;
};

export type EWalletMsgGetPublicKey = {
  target: "keplr_ewallet_attached";
  msg_type: "get_public_key";
  payload: null;
};

export type EWalletMsgGetPublicKeyAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "get_public_key_ack";
  payload: AckPayload<string>;
};

export type EWalletMsgSetOAuthNonce = {
  target: "keplr_ewallet_attached";
  msg_type: "set_oauth_nonce";
  payload: string;
};

export type EWalletMsgSetOAuthNonceAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "set_oauth_nonce_ack";
  payload: AckPayload<null>;
};

export type EWalletMsgOAuthSignIn = {
  target: "keplr_ewallet_attached";
  msg_type: "oauth_sign_in";
  payload: {
    access_token: string;
    id_token: string;
    customer_id: string;
    target_origin: string;
  };
};

export type EWalletMsgOAuthSignInAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "oauth_sign_in_ack";
  payload: AckPayload<null>;
};

export type EWalletMsgSignOut = {
  target: "keplr_ewallet_attached";
  msg_type: "sign_out";
  payload: null;
};

export type EWalletMsgSignOutAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "sign_out_ack";
  payload: AckPayload<null>;
};

export type EWalletMsgShowModal = {
  target: "keplr_ewallet_attached";
  msg_type: "show_modal";
  payload: ShowModalPayload;
};

export type EWalletMsgShowModalAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "show_modal_ack";
  payload: AckPayload<ModalResult>;
};

export type EWalletMsgHideModal = {
  target: "keplr_ewallet_attached";
  msg_type: "hide_modal";
  payload: null;
};

export type EWalletMsgHideModalAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "hide_modal_ack";
  payload: AckPayload<null>;
};

export type EWalletMsgInit = {
  target: "keplr_ewallet_attached";
  msg_type: "init";
  payload: boolean;
};

export type EWalletMsgInitAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "init_ack";
  payload: AckPayload<null>;
};

export type EWalletMsgGetEmail = {
  target: "keplr_ewallet_attached";
  msg_type: "get_email";
  payload: null;
};

export type EWalletMsgGetEmailAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "get_email_ack";
  payload: AckPayload<string>;
};

export type EWalletMsgInitState = {
  target: "keplr_ewallet_attached";
  msg_type: "init_state";
  payload: string;
};

export type EWalletMsgInitStateAck = {
  target: "keplr_ewallet_sdk";
  msg_type: "init_state_ack";
  payload: null;
};

export type EWalletMsg =
  | EWalletMsgInit
  | EWalletMsgInitAck
  | EWalletMsgGetPublicKey
  | EWalletMsgGetPublicKeyAck
  | EWalletMsgSetOAuthNonce
  | EWalletMsgSetOAuthNonceAck
  | EWalletMsgOAuthSignIn
  | EWalletMsgOAuthSignInAck
  | EWalletMsgSignOut
  | EWalletMsgSignOutAck
  | EWalletMsgMakeSignature
  | EWalletMsgMakeSignatureAck
  | EWalletMsgShowModal
  | EWalletMsgShowModalAck
  | EWalletMsgHideModal
  | EWalletMsgHideModalAck
  | EWalletMsgGetEmail
  | EWalletMsgGetEmailAck
  | EWalletMsgInitState
  | EWalletMsgInitStateAck
  | {
      target: "keplr_ewallet_sdk";
      msg_type: "unknown_msg_type";
      payload: string | null;
    };
