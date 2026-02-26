import type { ChainInfo } from "@keplr-wallet/types";
import type { Bytes32 } from "@oko-wallet/bytes";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";

import type { InitPayload } from "@oko-wallet-sdk-core/types/init";
import type {
  OpenModalAckPayload,
  OpenModalPayload,
} from "@oko-wallet-sdk-core/types/modal";
import type {
  OAuthPayload,
  OAuthTokenRequestPayload,
} from "@oko-wallet-sdk-core/types/oauth";
import type { OAuthSignInError } from "@oko-wallet-sdk-core/types/sign_in";

export * from "./export_priv_key";
export * from "./get_conn_apps";

export type OkoWalletMsgGetPublicKey = {
  target: "oko_attached";
  msg_type: "get_public_key";
  payload: null;
};

export type OkoWalletMsgGetPublicKeyAck = {
  target: "oko_sdk";
  msg_type: "get_public_key_ack";
  payload: Result<string, string>;
};

export type OkoWalletMsgGetPublicKeyEd25519 = {
  target: "oko_attached";
  msg_type: "get_public_key_ed25519";
  payload: null;
};

export type OkoWalletMsgGetPublicKeyEd25519Ack = {
  target: "oko_sdk";
  msg_type: "get_public_key_ed25519_ack";
  payload: Result<string, string>;
};

export type OkoWalletMsgSetOAuthNonce = {
  target: "oko_attached";
  msg_type: "set_oauth_nonce";
  payload: string;
};

export type OkoWalletMsgSetOAuthNonceAck = {
  target: "oko_sdk";
  msg_type: "set_oauth_nonce_ack";
  payload: Result<null, string>;
};

export type OkoWalletMsgSetCodeVerifier = {
  target: "oko_attached";
  msg_type: "set_code_verifier";
  payload: string;
};

export type OkoWalletMsgSetCodeVerifierAck = {
  target: "oko_sdk";
  msg_type: "set_code_verifier_ack";
  payload: Result<null, string>;
};

export type OkoWalletMsgOAuthSignInUpdate = {
  target: "oko_sdk";
  msg_type: "oauth_sign_in_update";
  payload: Result<null, OAuthSignInError>;
};

export type OkoWalletMsgOAuthSignInUpdateAck = {
  target: "oko_attached";
  msg_type: "oauth_sign_in_update_ack";
  payload: null;
};

export type OkoWalletMsgOAuthInfoPass = {
  target: "oko_attached";
  msg_type: "oauth_info_pass";
  payload: OAuthPayload | OAuthTokenRequestPayload;
};

export type OkoWalletMsgOAuthInfoPassAck = {
  target: "oko_attached_popup";
  msg_type: "oauth_info_pass_ack";
  payload: null;
};

export type OkoWalletMsgSignOut = {
  target: "oko_attached";
  msg_type: "sign_out";
  payload: null;
};

export type OkoWalletMsgSignOutAck = {
  target: "oko_sdk";
  msg_type: "sign_out_ack";
  payload: Result<null, string>;
};

export type OkoWalletMsgOpenModal = {
  target: "oko_attached";
  msg_type: "open_modal";
  payload: OpenModalPayload;
};

export type OkoWalletMsgOpenModalAck = {
  target: "oko_sdk";
  msg_type: "open_modal_ack";
  payload: OpenModalAckPayload;
};

export type OkoWalletMsgHideModal = {
  target: "oko_attached";
  msg_type: "hide_modal";
  payload: null;
};

export type OkoWalletMsgHideModalAck = {
  target: "oko_sdk";
  msg_type: "hide_modal_ack";
  payload: Result<null, string>;
};

export type OkoWalletMsgInit = {
  target: "oko_sdk";
  msg_type: "init";
  payload: Result<InitPayload, string>;
};

export type OkoWalletMsgInitAck = {
  target: "oko_attached";
  msg_type: "init_ack";
  payload: Result<null, string>;
};

export type OkoWalletMsgGetEmail = {
  target: "oko_attached";
  msg_type: "get_email";
  payload: null;
};

export type OkoWalletMsgGetEmailAck = {
  target: "oko_sdk";
  msg_type: "get_email_ack";
  payload: Result<string, string>;
};

export type OkoWalletMsgGetName = {
  target: "oko_attached";
  msg_type: "get_name";
  payload: null;
};

export type OkoWalletMsgGetNameAck = {
  target: "oko_sdk";
  msg_type: "get_name_ack";
  payload: Result<string, string>;
};

export type WalletInfo = {
  authType: AuthType;
  publicKey: string;
  email: string | null;
  name: string | null;
};

export type OkoWalletMsgGetWalletInfo = {
  target: "oko_attached";
  msg_type: "get_wallet_info";
  payload: null;
};

export type OkoWalletMsgGetWalletInfoAck = {
  target: "oko_sdk";
  msg_type: "get_wallet_info_ack";
  payload: Result<WalletInfo, string>;
};

export type OkoWalletMsgGetAuthType = {
  target: "oko_attached";
  msg_type: "get_auth_type";
  payload: null;
};

export type OkoWalletMsgGetAuthTypeAck = {
  target: "oko_sdk";
  msg_type: "get_auth_type_ack";
  payload: Result<AuthType, string>;
};

export type OkoWalletMsgGetCosmosChainInfo = {
  target: "oko_attached";
  msg_type: "get_cosmos_chain_info";
  payload: {
    chain_id: string | null;
  };
};

export type OkoWalletMsgGetCosmosChainInfoAck = {
  target: "oko_sdk";
  msg_type: "get_cosmos_chain_info_ack";
  payload: Result<ChainInfo[], string>;
};

export type OkoWalletMsgGetEthChainInfo = {
  target: "oko_attached";
  msg_type: "get_eth_chain_info";
  payload: {
    chain_id: string | null;
  };
};

export type OkoWalletMsgGetEthChainInfoAck = {
  target: "oko_sdk";
  msg_type: "get_eth_chain_info_ack";
  payload: Result<ChainInfo[], string>;
};

export type OkoWalletMsgImportPrivateKey = {
  target: "oko_attached";
  msg_type: "import_private_key";
  payload: OAuthPayload;
};

export type OkoWalletMsgImportPrivateKeyAck = {
  target: "oko_sdk";
  msg_type: "import_private_key_ack";
  payload: Result<Bytes32, string>;
};

export type OkoWalletMsg =
  | OkoWalletMsgInit
  | OkoWalletMsgInitAck
  | OkoWalletMsgGetPublicKey
  | OkoWalletMsgGetPublicKeyAck
  | OkoWalletMsgGetPublicKeyEd25519
  | OkoWalletMsgGetPublicKeyEd25519Ack
  | OkoWalletMsgSetOAuthNonce
  | OkoWalletMsgSetOAuthNonceAck
  | OkoWalletMsgSetCodeVerifier
  | OkoWalletMsgSetCodeVerifierAck
  | OkoWalletMsgOAuthSignInUpdate
  | OkoWalletMsgOAuthSignInUpdateAck
  | OkoWalletMsgOAuthInfoPass
  | OkoWalletMsgOAuthInfoPassAck
  | OkoWalletMsgSignOut
  | OkoWalletMsgSignOutAck
  | OkoWalletMsgOpenModal
  | OkoWalletMsgOpenModalAck
  | OkoWalletMsgHideModal
  | OkoWalletMsgHideModalAck
  | OkoWalletMsgGetEmail
  | OkoWalletMsgGetEmailAck
  | OkoWalletMsgGetName
  | OkoWalletMsgGetNameAck
  | OkoWalletMsgGetWalletInfo
  | OkoWalletMsgGetWalletInfoAck
  | OkoWalletMsgGetAuthType
  | OkoWalletMsgGetAuthTypeAck
  | OkoWalletMsgGetCosmosChainInfo
  | OkoWalletMsgGetCosmosChainInfoAck
  | OkoWalletMsgGetEthChainInfo
  | OkoWalletMsgGetEthChainInfoAck
  | OkoWalletMsgImportPrivateKey
  | OkoWalletMsgImportPrivateKeyAck
  | {
      target: "oko_sdk";
      msg_type: "unknown_msg_type";
      payload: string | null;
    };
