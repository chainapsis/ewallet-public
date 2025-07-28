import type { Bytes32, Bytes33 } from "@keplr-ewallet/crypto-js";

export interface WitnessedIdToken {
  witness_id: string;
  user_id: string;
  id_token_hash: Bytes32;
  status: IdTokenStatus;
  created_at: Date;
  updated_at: Date;
}

export type IdTokenStatus = "commit" | "reveal";

export interface CommitIdTokenRequest {
  user_id: string;
  user_session_public_key: Bytes33;
  id_token_hash: Bytes32;
}
