import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OperationType } from "@oko-wallet/oko-types/commit_reveal";
import type { OperationType as KsnOperationType } from "@oko-wallet/ksn-interface/commit_reveal";
import type { Bytes } from "@oko-wallet/bytes";

export interface ClientCommitRevealSession {
  session_id: string;
  operation_type: OperationType;
  client_keypair: {
    privateKey: Bytes<32>;
    publicKey: Bytes<32>;
  };
  id_token_hash: string;
  auth_type: AuthType;
  id_token: string;
  oko_api_node_pubkey?: string;
  ksn_node_pubkeys: Record<string, string>;
  ksn_operation_types: Record<string, KsnOperationType>;
  created_at: Date;
  expires_at: Date;
}

export interface KsnCommitTarget {
  nodeUrl: string;
  operationType: KsnOperationType;
}
