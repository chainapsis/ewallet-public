export type OperationType =
  | "sign_up"
  | "sign_in"
  | "reshare"
  | "add_ed25519"
  | "add_ed25519_with_reshare";

export type ApiName =
  | "signin"
  | "keygen"
  | "reshare"
  | "keygen_ed25519";

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

export interface CommitRevealParams {
  cr_session_id: string;
  cr_signature: string;
}
