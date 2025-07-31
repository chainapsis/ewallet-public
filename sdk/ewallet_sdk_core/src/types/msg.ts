import type { ChainInfo } from "@keplr-wallet/types";

import type { ModalResponse, ShowModalPayload } from "./modal";
import type {
  EWalletMakeSignaturePayload,
  EWalletMakeSignatureAckPayload,
} from "./sign";

export type EWalletMsgMakeSignature = {
  msg_type: "make_signature";
  payload: EWalletMakeSignaturePayload;
};

export type EWalletMsgMakeSignatureAck = {
  msg_type: "make_signature_ack";
  payload: EWalletMakeSignatureAckPayload;
};

export type EWalletMsgGetPublicKey = {
  msg_type: "get_public_key";
  payload: null;
};

export type EWalletMsgGetPublicKeyAck = {
  msg_type: "get_public_key_ack";
  payload: string | null;
};

export type EWalletMsgSetOAuthNonce = {
  msg_type: "set_oauth_nonce";
  payload: string;
};

export type EWalletMsgSetOAuthNonceAck = {
  msg_type: "set_oauth_nonce_ack";
  payload: string;
};

export type EWalletMsgOAuthSignIn = {
  msg_type: "oauth_sign_in";
  payload: {
    access_token: string;
    id_token: string;
    customer_id: string;
    target_origin: string;
  };
};

export type EWalletMsgOAuthSignInAck = {
  msg_type: "oauth_sign_in_ack";
  payload:
  | {
    success: true;
    wallet_id: string;
    public_key: string;
  }
  | {
    success: false;
    error: string;
  };
};

export type EWalletMsgSignOut = {
  msg_type: "sign_out";
  payload: null;
};

export type EWalletMsgSignOutAck = {
  msg_type: "sign_out_ack";
  payload: null;
};

export type EWalletMsgShowModal = {
  msg_type: "show_modal";
  payload: ShowModalPayload;
};

export type EWalletMsgShowModalAck = {
  msg_type: "show_modal_ack";
  payload: ModalResponse;
};

export type EWalletMsgHideModal = {
  msg_type: "hide_modal";
  payload: null;
};

export type EWalletMsgHideModalAck = {
  msg_type: "hide_modal_ack";
  payload: null;
};

export type EWalletMsgInit = {
  msg_type: "init";
  payload: boolean;
};

export type EWalletMsgInitAck = {
  msg_type: "init_ack";
  payload: boolean;
};

export type EWalletMsgGetEmail = {
  msg_type: "get_email";
  payload: null;
};

export type EWalletMsgGetEmailAck = {
  msg_type: "get_email_ack";
  payload: string | null;
};

// export type EWalletMsgGetCosmosChainInfo = {
//   msg_type: "get_cosmos_chain_info";
//   payload: null;
// };

// export type EWalletMsgGetCosmosChainInfoAck = {
//   msg_type: "get_cosmos_chain_info_ack";
//   payload:
//     | { success: true; data: ChainInfo[] }
//     | { success: false; error: string };
// };

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
  // | EWalletMsgGetCosmosChainInfo
  // | EWalletMsgGetCosmosChainInfoAck
  | {
    msg_type: "unknown";
    payload: string | null;
  };
