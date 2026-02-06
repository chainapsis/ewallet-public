export type OperationType =
  | "sign_up"
  | "sign_in"
  | "reshare"
  | "add_ed25519"
  | "add_ed25519_with_reshare";

export type ApiName =
  | "get_key_shares"
  | "register"
  | "reshare"
  | "register_ed25519";

export type SessionState = "COMMITTED" | "COMPLETED";

export interface CommitRevealSession {
  session_id: string;
  operation_type: OperationType;
  client_ephemeral_pubkey: Uint8Array;
  id_token_hash: string;
  state: SessionState;
  created_at: Date;
  expires_at: Date;
}

export interface CommitRevealApiCall {
  id: string;
  session_id: string;
  api_name: string;
  signature: Uint8Array;
  called_at: Date;
}

export interface CreateSessionParams {
  session_id: string;
  operation_type: OperationType;
  client_ephemeral_pubkey: Uint8Array;
  id_token_hash: string;
  expires_at: Date;
}

export interface CommitRequestBody {
  session_id: string;
  operation_type: OperationType;
  client_ephemeral_pubkey: string;
  id_token_hash: string;
}

export interface CommitResponseData {
  node_pubkey: string;
  node_signature: string;
}
