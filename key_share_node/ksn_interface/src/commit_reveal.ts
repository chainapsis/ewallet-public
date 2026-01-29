export type OperationType =
  | "sign_in"
  | "sign_up"
  | "sign_in_reshare"
  | "register_reshare"
  | "add_ed25519";

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
