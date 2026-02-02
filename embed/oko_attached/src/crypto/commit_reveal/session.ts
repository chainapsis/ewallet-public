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
    ksn_operation_types: {
      ...session.ksn_operation_types,
      [nodeUrl]: operationType,
    },
  };
}

/**
 * Commit to oko_api and ks nodes.
 * Creates a commit-reveal session and sends commit requests.
 *
 * @param okoApiOperationType - Operation type for oko_api commit
 * @param ksnCommitTargets - All ks nodes to commit to
 *
 * All nodes must successfully commit for the operation to proceed.
 * If any node fails, the entire operation fails and user must re-login.
 */
export async function commitAll(
  okoApiOperationType: OperationType,
  authType: AuthType,
  idToken: string,
  ksnCommitTargets: KsnCommitTarget[],
): Promise<Result<ClientCommitRevealSession, string>> {
  // 1. Create session
  const sessionRes = createCommitRevealSession(
    okoApiOperationType,
    authType,
    idToken,
  );
  if (!sessionRes.success) {
    return { success: false, err: sessionRes.err };
  }
  let session = sessionRes.data;

  const clientPubkeyHex = session.client_keypair.publicKey.toHex();

  // 2. Commit to oko_api
  const okoApiResult = await commitToOkoApi(
    session.session_id,
    okoApiOperationType,
    clientPubkeyHex,
    session.id_token_hash,
  );

  if (!okoApiResult.success || !okoApiResult.data.success) {
    return { success: false, err: "Failed to commit to oko_api" };
  }
  session = setOkoApiNodePubkey(session, okoApiResult.data.data.node_pubkey);

  // 3. Commit to all ks nodes in parallel
  // All nodes must succeed for the operation to proceed
  const results = await Promise.allSettled(
    ksnCommitTargets.map((target) =>
      commitToKsNode(
        target.nodeUrl,
        session.session_id,
        target.operationType,
        clientPubkeyHex,
        session.id_token_hash,
      ).then((res) => ({
        nodeUrl: target.nodeUrl,
        operationType: target.operationType,
        res,
      })),
    ),
  );

  const failedNodes: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.res.success) {
      session = setKsnNodePubkey(
        session,
        result.value.nodeUrl,
        result.value.res.data.node_pubkey,
        result.value.operationType,
      );
    } else {
      const nodeUrl =
        result.status === "fulfilled"
          ? result.value.nodeUrl
          : "unknown";
      failedNodes.push(nodeUrl);
    }
  }

  if (failedNodes.length > 0) {
    return {
      success: false,
      err: `Failed to commit to ks nodes: ${failedNodes.join(", ")}`,
    };
  }

  return { success: true, data: session };
}
