import type { AuthType } from "@oko-wallet/oko-types/auth";

export type OkoWalletMsgExportPrivateKey = {
  target: "oko_attached";
  msg_type: "__export_private_key__";
  payload: { auth_type: AuthType };
};

export type ExportPrivateKeyError =
  | { type: "UNAUTHORIZED_ORIGIN" }
  | { type: "NOT_AUTHENTICATED" }
  | { type: "MISSING_KEY_SHARES" }
  | { type: "COMBINE_ERROR"; error: string }
  | { type: "API_ERROR"; error: string }
  | { type: "REAUTH_TIMEOUT" }
  | { type: "REAUTH_ERROR"; error: string };

export type ExportPrivateKeyAckPayload =
  | { success: true; data: { secp256k1: string; ed25519: string } }
  | { success: false; error: ExportPrivateKeyError };

export interface OkoWalletMsgExportPrivateKeyAck {
  target: "oko_sdk";
  msg_type: "__export_private_key_ack__";
  payload: ExportPrivateKeyAckPayload;
}
