import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OperationType } from "@oko-wallet/oko-types/commit_reveal";
import type { Result } from "@oko-wallet/stdlib-js";

import type { ClientCommitRevealSession } from "./types";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  SESSION_TIMEOUT_MS,
} from "./utils";

export function createCommitRevealSession(
  operationType: OperationType,
  authType: AuthType,
  idToken: string,
): Result<ClientCommitRevealSession, string> {
  const keypairRes = generateClientKeypair();
  if (!keypairRes.success) {
    return { success: false, err: keypairRes.err };
  }

  const hashRes = computeIdTokenHash(authType, idToken);
  if (!hashRes.success) {
    return { success: false, err: hashRes.err };
  }

  const now = new Date();
  return {
    success: true,
    data: {
      session_id: generateSessionId(),
      operation_type: operationType,
      client_keypair: keypairRes.data,
      id_token_hash: hashRes.data,
      auth_type: authType,
      id_token: idToken,
      ksn_node_pubkeys: {},
      created_at: now,
      expires_at: new Date(now.getTime() + SESSION_TIMEOUT_MS),
    },
  };
}

export function setOkoApiNodePubkey(
  session: ClientCommitRevealSession,
  nodePubkey: string,
): ClientCommitRevealSession {
  return { ...session, oko_api_node_pubkey: nodePubkey };
}

export function setKsnNodePubkey(
  session: ClientCommitRevealSession,
  nodeUrl: string,
  nodePubkey: string,
): ClientCommitRevealSession {
  return {
    ...session,
    ksn_node_pubkeys: { ...session.ksn_node_pubkeys, [nodeUrl]: nodePubkey },
  };
}
