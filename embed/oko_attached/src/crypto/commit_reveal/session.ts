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
 * Commit to oko_api and KSN nodes.
 * Creates a commit-reveal session and sends commit requests.
 *
 * @param ksnThreshold - Number of KSN nodes that must successfully commit.
 *   - For sign_in: pass the MPC threshold (e.g., 2)
 *   - For register/reshare: pass targets.length (all nodes must succeed)
 *
 * Shuffles nodes and tries threshold first, retries with backup on failure.
 */
export async function commitAll(
  operationType: OperationType,
  authType: AuthType,
  idToken: string,
  ksnCommitTargets: KsnCommitTarget[],
  ksnThreshold: number,
): Promise<Result<ClientCommitRevealSession, string>> {
  // 1. Create session
  const sessionRes = createCommitRevealSession(
    operationType,
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
    operationType,
    clientPubkeyHex,
    session.id_token_hash,
  );

  if (!okoApiResult.success || !okoApiResult.data.success) {
    return { success: false, err: "Failed to commit to oko_api" };
  }
  session = setOkoApiNodePubkey(session, okoApiResult.data.data.node_pubkey);

  // 3. Commit to KSN nodes
  // Shuffle nodes
  const shuffledTargets = [...ksnCommitTargets];
  for (let i = shuffledTargets.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTargets[i], shuffledTargets[j]] = [
      shuffledTargets[j],
      shuffledTargets[i],
    ];
  }

  const committedNodes: string[] = [];
  let targetsToTry = shuffledTargets.slice(0, ksnThreshold);
  let backupTargets = shuffledTargets.slice(ksnThreshold);

  while (committedNodes.length < ksnThreshold && targetsToTry.length > 0) {
    const results = await Promise.allSettled(
      targetsToTry.map((target) =>
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

    const failedTargets: KsnCommitTarget[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const target = targetsToTry[i];

      if (result.status === "fulfilled" && result.value.res.success) {
        session = setKsnNodePubkey(
          session,
          result.value.nodeUrl,
          result.value.res.data.node_pubkey,
          result.value.operationType,
        );
        committedNodes.push(result.value.nodeUrl);
      } else {
        failedTargets.push(target);
      }
    }

    if (committedNodes.length >= ksnThreshold) {
      break;
    }

    // Try backup nodes for failed ones
    targetsToTry = [];
    for (let i = 0; i < failedTargets.length && backupTargets.length > 0; i++) {
      targetsToTry.push(backupTargets.shift()!);
    }
  }

  if (committedNodes.length < ksnThreshold) {
    return {
      success: false,
      err: `Insufficient KSN commits: got ${committedNodes.length}, need ${ksnThreshold}`,
    };
  }

  return { success: true, data: session };
}
