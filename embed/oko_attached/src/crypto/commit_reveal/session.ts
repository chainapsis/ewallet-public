import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OperationType } from "@oko-wallet/oko-types/commit_reveal";
import type { OperationType as KsnOperationType } from "@oko-wallet/ksn-interface/commit_reveal";
import type { Result } from "@oko-wallet/stdlib-js";

import type { ClientCommitRevealSession, KsnCommitTarget } from "./types";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  SESSION_TIMEOUT_MS,
} from "./utils";
import { commitToOkoApi } from "@oko-wallet-attached/requests/oko_api";
import { commitToKsNode } from "@oko-wallet-attached/requests/ks_node_v2";

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
      ksn_operation_types: {},
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
  operationType: KsnOperationType,
): ClientCommitRevealSession {
  return {
    ...session,
    ksn_node_pubkeys: { ...session.ksn_node_pubkeys, [nodeUrl]: nodePubkey },
    ksn_operation_types: { ...session.ksn_operation_types, [nodeUrl]: operationType },
  };
}

export interface CommitAllResult {
  session: ClientCommitRevealSession;
  okoApiCommitted: boolean;
  ksnCommittedNodes: string[];
}

/**
 * Commit to oko_api and KSN nodes in parallel.
 * Creates a commit-reveal session and sends commit requests to all nodes.
 * Supports per-node KSN operation types for reshare scenarios where ACTIVE and new nodes
 * use different operation types.
 */
export async function commitAll(
  operationType: OperationType,
  authType: AuthType,
  idToken: string,
  ksnCommitTargets: KsnCommitTarget[],
): Promise<Result<CommitAllResult, string>> {
  // 1. Create session
  const sessionRes = createCommitRevealSession(operationType, authType, idToken);
  if (!sessionRes.success) {
    return { success: false, err: sessionRes.err };
  }
  let session = sessionRes.data;

  const clientPubkeyHex = session.client_keypair.publicKey.toHex();

  // 2. Commit to oko_api and KSN nodes in parallel
  const [okoApiResult, ...ksnResults] = await Promise.allSettled([
    commitToOkoApi(
      session.session_id,
      operationType,
      clientPubkeyHex,
      session.id_token_hash,
    ),
    ...ksnCommitTargets.map((target) =>
      commitToKsNode(
        target.nodeUrl,
        session.session_id,
        target.operationType,
        clientPubkeyHex,
        session.id_token_hash,
      ).then((res) => ({ nodeUrl: target.nodeUrl, operationType: target.operationType, res })),
    ),
  ]);

  // 3. Process oko_api result
  let okoApiCommitted = false;
  if (okoApiResult.status === "fulfilled" && okoApiResult.value.success) {
    const apiResponse = okoApiResult.value.data;
    if (apiResponse.success) {
      session = setOkoApiNodePubkey(session, apiResponse.data.node_pubkey);
      okoApiCommitted = true;
    }
  }

  // 4. Process KSN results
  const ksnCommittedNodes: string[] = [];
  for (const result of ksnResults) {
    if (result.status === "fulfilled") {
      const { nodeUrl, operationType: ksnOpType, res } = result.value;
      if (res.success) {
        session = setKsnNodePubkey(session, nodeUrl, res.data.node_pubkey, ksnOpType);
        ksnCommittedNodes.push(nodeUrl);
      }
    }
  }

  // 5. Check if we have enough commits
  if (!okoApiCommitted) {
    return { success: false, err: "Failed to commit to oko_api" };
  }

  if (ksnCommittedNodes.length === 0) {
    return { success: false, err: "Failed to commit to any KSN node" };
  }

  return {
    success: true,
    data: {
      session,
      okoApiCommitted,
      ksnCommittedNodes,
    },
  };
}
