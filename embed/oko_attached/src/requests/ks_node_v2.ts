import type {
  GetKeyShareV2Response,
  GetKeyShareV2WithCRRequestBody,
  RegisterKeyShareV2WithCRRequestBody,
  RegisterEd25519V2WithCRRequestBody,
  ReshareKeyShareV2WithCRRequestBody,
} from "@oko-wallet/ksn-interface/key_share";
import type {
  CommitRequestBody,
  CommitResponseData,
} from "@oko-wallet/ksn-interface/commit_reveal";
import type { OperationType } from "@oko-wallet/ksn-interface/commit_reveal";
import type { NodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { CommitRevealParams } from "@oko-wallet/oko-types/commit_reveal";
import type { Result } from "@oko-wallet/stdlib-js";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import type {
  ClientCommitRevealSession,
  KsnCommitResult,
} from "@oko-wallet-attached/crypto/commit_reveal/types";
import { createKsnCommitRevealParams } from "@oko-wallet-attached/crypto/commit_reveal/signature";
import { setKsnNodePubkey } from "@oko-wallet-attached/crypto/commit_reveal/session";

export interface KeySharesByNode {
  node: { name: string; endpoint: string };
  shares: {
    secp256k1: string;
    ed25519: string;
    ed25519_seed_share: string;
  };
}

export interface RequestKeySharesV2Success {
  shares: KeySharesByNode[];
  /** Nodes that returned KEY_SHARE_NOT_FOUND - should be reported to oko_api */
  notFoundNodes: NodeStatusInfo[];
}

export interface RequestKeySharesV2Error {
  code: "INSUFFICIENT_SHARES";
  got: number;
  need: number;
}

/**
 * Request key shares from KS nodes with backup node support.
 *
 * Uses readyNodes from commitAll first, then falls back to pendingCommits if needed.
 * Tracks nodes that returned KEY_SHARE_NOT_FOUND for later reporting.
 *
 * Use this for sign-in flow where we want latency optimization with backup fallback.
 *
 * @param params.idToken - OAuth ID token
 * @param params.authType - Authentication type
 * @param params.wallets - Public keys for both curves
 * @param params.threshold - Minimum shares needed
 * @param params.session - Commit-reveal session
 * @param params.readyNodes - Nodes that already committed (from commitAll)
 * @param params.pendingCommits - Backup nodes still committing (from commitAll)
 * @param params.allNodes - All nodes for info lookup
 */
export async function requestKeySharesWithBackup(params: {
  idToken: string;
  authType: AuthType;
  wallets: { secp256k1: string; ed25519: string };
  threshold: number;
  session: ClientCommitRevealSession;
  readyNodes: KsnCommitResult[];
  pendingCommits: Map<string, Promise<KsnCommitResult>>;
  allNodes: NodeStatusInfo[];
}): Promise<Result<RequestKeySharesV2Success, RequestKeySharesV2Error>> {
  const {
    idToken,
    authType,
    wallets,
    threshold,
    readyNodes,
    pendingCommits,
    allNodes,
  } = params;
  let session = params.session;

  // Build endpoint -> NodeStatusInfo map for quick lookup
  const nodeInfoMap = new Map<string, NodeStatusInfo>();
  for (const node of allNodes) {
    nodeInfoMap.set(node.endpoint, node);
  }

  const succeededShares: KeySharesByNode[] = [];
  const notFoundNodes: NodeStatusInfo[] = [];

  // Convert readyNodes to a queue of endpoints to try
  const readyEndpoints = readyNodes.map((n) => n.nodeUrl);
  const pendingEndpoints = [...pendingCommits.keys()];

  // Try ready nodes first, then pending nodes as backups
  const endpointsToTry = [...readyEndpoints];
  let backupIndex = 0;

  // Helper to await next backup node and add to queue
  async function tryAddBackupNode(): Promise<void> {
    while (backupIndex < pendingEndpoints.length) {
      const backupEndpoint = pendingEndpoints[backupIndex];
      backupIndex++;

      const pendingPromise = pendingCommits.get(backupEndpoint);
      if (!pendingPromise) {
        continue;
      }

      try {
        const commitResult = await pendingPromise;
        // Update session with backup node's pubkey so signature can be created
        session = setKsnNodePubkey(
          session,
          commitResult.nodeUrl,
          commitResult.nodePubkey,
          commitResult.operationType,
        );
        endpointsToTry.push(backupEndpoint);
        return;
      } catch {
        // Backup commit failed, try next
        continue;
      }
    }
  }

  while (succeededShares.length < threshold && endpointsToTry.length > 0) {
    const endpoint = endpointsToTry.shift()!;
    const nodeInfo = nodeInfoMap.get(endpoint);
    if (!nodeInfo) {
      continue; // Skip if node info not found
    }

    const result = await requestKeyShareFromNode({
      idToken,
      authType,
      wallets,
      session,
      node: nodeInfo,
    });

    if (result.success) {
      succeededShares.push(result.data);
    } else if (result.err === "KEY_SHARE_NOT_FOUND") {
      // Track for reporting, try backup
      notFoundNodes.push(nodeInfo);
      await tryAddBackupNode();
    } else {
      // Other error, try backup
      await tryAddBackupNode();
    }
  }

  if (succeededShares.length >= threshold) {
    return {
      success: true,
      data: {
        shares: succeededShares,
        notFoundNodes,
      },
    };
  }

  return {
    success: false,
    err: {
      code: "INSUFFICIENT_SHARES",
      got: succeededShares.length,
      need: threshold,
    },
  };
}

async function requestKeyShareFromNode(params: {
  idToken: string;
  authType: AuthType;
  wallets: { secp256k1: string; ed25519: string };
  session: ClientCommitRevealSession;
  node: NodeStatusInfo;
}): Promise<Result<KeySharesByNode, string>> {
  const { idToken, authType, wallets, session, node } = params;

  // Create commit-reveal signature
  const commitRevealRes = createKsnCommitRevealParams(
    session,
    node.endpoint,
    "get_key_shares",
  );
  if (!commitRevealRes.success) {
    return { success: false, err: commitRevealRes.err };
  }

  const body: GetKeyShareV2WithCRRequestBody = {
    auth_type: authType,
    wallets: {
      secp256k1: wallets.secp256k1,
      ed25519: wallets.ed25519,
    },
    cr_session_id: commitRevealRes.data.cr_session_id,
    cr_signature: commitRevealRes.data.cr_signature,
  };

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${node.endpoint}/keyshare/v2/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data =
        (await response.json()) as KSNodeApiResponse<GetKeyShareV2Response>;

      if (!response.ok || !data.success) {
        const errorCode = data.success === false ? data.code : null;

        // Not-found errors: don't retry, return immediately
        if (
          errorCode === "USER_NOT_FOUND" ||
          errorCode === "WALLET_NOT_FOUND" ||
          errorCode === "KEY_SHARE_NOT_FOUND"
        ) {
          return { success: false, err: "KEY_SHARE_NOT_FOUND" };
        }

        // Other errors: retry if attempts remain
        if (attempt < MAX_RETRIES - 1) {
          continue;
        }
        return { success: false, err: errorCode ?? `HTTP_${response.status}` };
      }

      // Validate response has both shares
      if (!data.data.secp256k1 || !data.data.ed25519) {
        return { success: false, err: "MISSING_WALLET_DATA" };
      }

      return {
        success: true,
        data: {
          node: { name: node.name, endpoint: node.endpoint },
          shares: {
            secp256k1: data.data.secp256k1.share,
            ed25519: data.data.ed25519.share,
            ed25519_seed_share: data.data.ed25519.seed_share,
          },
        },
      };
    } catch (e) {
      if (attempt < MAX_RETRIES - 1) {
        continue;
      }
      return { success: false, err: `Network error: ${String(e)}` };
    }
  }

  return { success: false, err: "Max retries exceeded" };
}

/**
 * Request key shares from specific nodes (parallel, no backup).
 *
 * Requests from all given nodes in parallel, returns success if threshold shares obtained.
 * Use this for reshare flow where all nodes are already committed.
 *
 * @param params.idToken - OAuth ID token
 * @param params.authType - Authentication type
 * @param params.wallets - Public keys for both curves
 * @param params.threshold - Minimum shares needed
 * @param params.session - Commit-reveal session
 * @param params.nodes - Nodes to request from
 */
export async function requestKeyShares(params: {
  idToken: string;
  authType: AuthType;
  wallets: { secp256k1: string; ed25519: string };
  threshold: number;
  session: ClientCommitRevealSession;
  nodes: NodeStatusInfo[];
}): Promise<Result<KeySharesByNode[], RequestKeySharesV2Error>> {
  const { idToken, authType, wallets, threshold, session, nodes } = params;

  const results = await Promise.all(
    nodes.map((node) =>
      requestKeyShareFromNode({ idToken, authType, wallets, session, node }),
    ),
  );

  const succeeded: KeySharesByNode[] = [];
  for (const result of results) {
    if (result.success) {
      succeeded.push(result.data);
    }
  }

  if (succeeded.length >= threshold) {
    return { success: true, data: succeeded };
  }

  return {
    success: false,
    err: {
      code: "INSUFFICIENT_SHARES",
      got: succeeded.length,
      need: threshold,
    },
  };
}

/**
 * Register key shares to a single KS node using V2 API.
 * Supports registering both secp256k1 and ed25519 shares in a single request.
 */
export async function registerKeySharesV2(
  ksNodeEndpoint: string,
  idToken: string,
  authType: AuthType,
  wallets: {
    secp256k1?: { public_key: string; share: string };
    ed25519?: { public_key: string; share: string; seed_share: string };
  },
  commitReveal: CommitRevealParams,
): Promise<Result<void, string>> {
  const body: RegisterKeyShareV2WithCRRequestBody = {
    auth_type: authType,
    wallets: {
      ...(wallets.secp256k1 && {
        secp256k1: {
          public_key: wallets.secp256k1.public_key,
          share: wallets.secp256k1.share,
        },
      }),
      ...(wallets.ed25519 && {
        ed25519: {
          public_key: wallets.ed25519.public_key,
          share: wallets.ed25519.share,
          seed_share: wallets.ed25519.seed_share,
        },
      }),
    },
    cr_session_id: commitReveal.cr_session_id,
    cr_signature: commitReveal.cr_signature,
  };

  try {
    const response = await fetch(`${ksNodeEndpoint}/keyshare/v2/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      try {
        const data = (await response.json()) as KSNodeApiResponse<void>;
        if (!data.success && data.code === "DUPLICATE_PUBLIC_KEY") {
          return { success: true, data: void 0 };
        }
      } catch (_) {}

      return {
        success: false,
        err: `Failed to register key shares: status(${response.status}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as KSNodeApiResponse<void>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to register key shares: ${data.code || "UNKNOWN_ERROR"} in ${ksNodeEndpoint}`,
      };
    }

    return { success: true, data: void 0 };
  } catch (e) {
    return {
      success: false,
      err: `Failed to register key shares in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}

/**
 * Register ed25519 key share for an existing user who already has secp256k1 wallet.
 */
export async function registerKeyShareEd25519V2(
  ksNodeEndpoint: string,
  idToken: string,
  authType: AuthType,
  publicKey: string,
  share: string,
  commitReveal: CommitRevealParams,
  seedShare: string,
): Promise<Result<void, string>> {
  const body: RegisterEd25519V2WithCRRequestBody = {
    auth_type: authType,
    public_key: publicKey,
    share,
    seed_share: seedShare,
    cr_session_id: commitReveal.cr_session_id,
    cr_signature: commitReveal.cr_signature,
  };

  try {
    const response = await fetch(
      `${ksNodeEndpoint}/keyshare/v2/register/ed25519`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      try {
        const data = (await response.json()) as KSNodeApiResponse<void>;
        if (!data.success && data.code === "DUPLICATE_PUBLIC_KEY") {
          return { success: true, data: void 0 };
        }
      } catch (_) {}

      return {
        success: false,
        err: `Failed to register ed25519 key share: status(${response.status}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as KSNodeApiResponse<void>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to register ed25519 key share: ${data.code || "UNKNOWN_ERROR"} in ${ksNodeEndpoint}`,
      };
    }

    return { success: true, data: void 0 };
  } catch (e) {
    return {
      success: false,
      err: `Failed to register ed25519 key share in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}

/**
 * Update existing key shares on a KS node (reshare scenario).
 */
export async function reshareKeySharesV2(
  ksNodeEndpoint: string,
  idToken: string,
  authType: AuthType,
  wallets: {
    secp256k1: { public_key: string; share: string };
    ed25519: { public_key: string; share: string; seed_share: string };
  },
  commitReveal: CommitRevealParams,
): Promise<Result<void, string>> {
  const body: ReshareKeyShareV2WithCRRequestBody = {
    auth_type: authType,
    wallets: {
      secp256k1: {
        public_key: wallets.secp256k1.public_key,
        share: wallets.secp256k1.share,
      },
      ed25519: {
        public_key: wallets.ed25519.public_key,
        share: wallets.ed25519.share,
        seed_share: wallets.ed25519.seed_share,
      },
    },
    cr_session_id: commitReveal.cr_session_id,
    cr_signature: commitReveal.cr_signature,
  };

  try {
    const response = await fetch(`${ksNodeEndpoint}/keyshare/v2/reshare`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        success: false,
        err: `Failed to reshare key shares: status(${response.status}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as KSNodeApiResponse<void>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to reshare key shares: ${data.code || "UNKNOWN_ERROR"} in ${ksNodeEndpoint}`,
      };
    }

    return { success: true, data: void 0 };
  } catch (e) {
    return {
      success: false,
      err: `Failed to reshare key shares in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}

/**
 * Commit to a KS node for commit-reveal scheme.
 */
export async function commitToKsNode(
  nodeEndpoint: string,
  sessionId: string,
  operationType: OperationType,
  clientEphemeralPubkey: string,
  idTokenHash: string,
): Promise<Result<CommitResponseData, string>> {
  const body: CommitRequestBody = {
    session_id: sessionId,
    operation_type: operationType,
    client_ephemeral_pubkey: clientEphemeralPubkey,
    id_token_hash: idTokenHash,
  };

  try {
    const response = await fetch(`${nodeEndpoint}/keyshare/v2/commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        success: false,
        err: `Failed to commit: status(${response.status}) in ${nodeEndpoint}`,
      };
    }

    const data =
      (await response.json()) as KSNodeApiResponse<CommitResponseData>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to commit: ${data.code || "UNKNOWN_ERROR"} in ${nodeEndpoint}`,
      };
    }

    return { success: true, data: data.data };
  } catch (e) {
    return {
      success: false,
      err: `Failed to commit in ${nodeEndpoint}: ${String(e)}`,
    };
  }
}
