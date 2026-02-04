import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OperationType } from "@oko-wallet/oko-types/commit_reveal";
import type { OperationType as KsnOperationType } from "@oko-wallet/ksn-interface/commit_reveal";
import type { Result } from "@oko-wallet/stdlib-js";

import type {
  ClientCommitRevealSession,
  KsnCommitTarget,
  KsnCommitResult,
  CommitAllResult,
} from "./types";
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
 * Commit to oko_api and ks nodes with threshold-based early return.
 *
 * Returns as soon as `threshold` nodes have successfully committed,
 * allowing remaining nodes to be used as backups if needed.
 *
 * @param okoApiOperationType - Operation type for oko_api commit
 * @param authType - Authentication type
 * @param idToken - ID token
 * @param ksnCommitTargets - All ks nodes to commit to
 * @param threshold - Minimum number of nodes that must succeed
 *
 * @returns CommitAllResult with ready nodes, pending commits, and failed nodes
 */
export async function commitAll(
  okoApiOperationType: OperationType,
  authType: AuthType,
  idToken: string,
  ksnCommitTargets: KsnCommitTarget[],
  threshold: number,
): Promise<Result<CommitAllResult, string>> {
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

  // 2. Commit to oko_api first (must succeed)
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

  // 3. Start commits to all KSN nodes
  const readyNodes: KsnCommitResult[] = [];
  const failedNodes: { nodeUrl: string; error: string }[] = [];
  const pendingCommits = new Map<string, Promise<KsnCommitResult>>();

  // Create individual promises for each node
  type CommitOutcome =
    | { success: true; result: KsnCommitResult }
    | { success: false; error: string };

  const nodePromises = ksnCommitTargets.map((target) => {
    const promise = commitToKsNode(
      target.nodeUrl,
      session.session_id,
      target.operationType,
      clientPubkeyHex,
      session.id_token_hash,
    ).then((res): CommitOutcome => {
      if (res.success) {
        return {
          success: true,
          result: {
            nodeUrl: target.nodeUrl,
            operationType: target.operationType,
            nodePubkey: res.data.node_pubkey,
          },
        };
      }
      return { success: false, error: res.err };
    });

    return { target, promise };
  });

  // Add all to pending initially (for backup use later)
  for (const { target, promise } of nodePromises) {
    pendingCommits.set(
      target.nodeUrl,
      promise.then((outcome) => {
        if (!outcome.success) {
          throw new Error(outcome.error);
        }
        return outcome.result;
      }),
    );
  }

  // Race to get threshold successful commits
  const remainingPromises = [...nodePromises];

  while (readyNodes.length < threshold && remainingPromises.length > 0) {
    // Wait for the first one to complete
    const raceResult = await Promise.race(
      remainingPromises.map(async ({ target, promise }, index) => {
        const outcome = await promise;
        return { index, target, outcome };
      }),
    );

    // Remove from remaining
    remainingPromises.splice(raceResult.index, 1);

    if (raceResult.outcome.success) {
      // Success - add to ready nodes and update session
      const result = raceResult.outcome.result;
      readyNodes.push(result);
      pendingCommits.delete(raceResult.target.nodeUrl);
      session = setKsnNodePubkey(
        session,
        result.nodeUrl,
        result.nodePubkey,
        result.operationType,
      );
    } else {
      // Failed - add to failed nodes with actual API error
      failedNodes.push({
        nodeUrl: raceResult.target.nodeUrl,
        error: raceResult.outcome.error,
      });
      pendingCommits.delete(raceResult.target.nodeUrl);
    }
  }

  // Check if we have enough nodes
  if (readyNodes.length < threshold) {
    return {
      success: false,
      err: `Insufficient nodes committed: got ${readyNodes.length}, need ${threshold}`,
    };
  }

  // Move remaining promises to pendingCommits (for backup use)
  // They're already in pendingCommits, just need to update with proper promises
  for (const { target, promise } of remainingPromises) {
    pendingCommits.set(
      target.nodeUrl,
      promise.then((outcome) => {
        if (!outcome.success) {
          throw new Error(outcome.error);
        }
        return outcome.result;
      }),
    );
  }

  return {
    success: true,
    data: {
      session,
      readyNodes,
      pendingCommits,
      failedNodes,
    },
  };
}
