import { Pool } from "pg";
import type { Logger } from "winston";
import {
  getActiveWalletByUserIdAndCurveType,
  getWalletByPublicKey,
  getWalletByIdWithAuthInfo,
} from "@oko-wallet/oko-pg-interface/oko_wallets";
import type {
  CheckEmailResponseV2,
  ReshareReason,
  ReportKeyShareNotFoundRequest,
  ReportKeyShareNotFoundResponse,
  SignInResponseV2,
  User,
} from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import {
  getUserByEmailAndAuthType,
  updateUserMetadata,
} from "@oko-wallet/oko-pg-interface/oko_users";
import {
  getActiveKSNodes,
  getWalletKSNodesByWalletId,
  getKSNodesByServerUrl,
  upsertWalletKSNodes,
  updateWalletKSNodeStatusToDataLoss,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import type {
  WalletKSNodeStatus,
  KeyShareNode,
  KeyShareNodeMetaWithNodeStatusInfo,
} from "@oko-wallet/oko-types/tss";
import { getKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";
import type { Wallet } from "@oko-wallet/oko-types/wallets";
import { Bytes, type Bytes32, type Bytes33 } from "@oko-wallet/bytes";
import { decryptDataAsync } from "@oko-wallet/crypto-js/node";
import type { Result } from "@oko-wallet/stdlib-js";

import { generateUserTokenV2 } from "@oko-wallet-api/api/tss/keplr_auth";
import { checkKeyShareFromKSNodesV2 } from "@oko-wallet-api/api/tss/ks_node";
import { saveUserCustomerConnection } from "@oko-wallet-api/api/tss/connection";
import { requestCheckKeyShareV2 } from "@oko-wallet-api/requests";

// Higher = worse (needs more attention)
const STATUS_SEVERITY: Record<WalletKSNodeStatus, number> = {
  ACTIVE: 0,
  INACTIVE: 1,
  UNRECOVERABLE_DATA_LOSS: 2,
  NOT_REGISTERED: 3,
};

export async function signInV2(
  db: Pool,
  user_identifier: string,
  auth_type: AuthType,
  jwt_config: {
    secret: string;
    expires_in: string;
  },
  encryptionSecret: string,
  logger: Logger,
  email?: string,
  name?: string,
  metadata?: Record<string, unknown>,
  customerId?: string,
): Promise<OkoApiResponse<SignInResponseV2>> {
  try {
    const getUserRes = await getUserByEmailAndAuthType(
      db,
      user_identifier,
      auth_type,
    );
    if (getUserRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getUserByEmailAndAuthType error: ${getUserRes.err}`,
      };
    }
    if (getUserRes.data === null) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: `User not found: ${user_identifier} (auth_type: ${auth_type})`,
      };
    }

    // Update user metadata on every sign-in
    if (metadata) {
      const updateMetadataRes = await updateUserMetadata(
        db,
        getUserRes.data.user_id,
        metadata,
      );
      if (updateMetadataRes.success === false) {
        logger.error(
          `Failed to update user metadata: ${updateMetadataRes.err}`,
        );
      }
    }

    const secp256k1WalletRes = await getActiveWalletByUserIdAndCurveType(
      db,
      getUserRes.data.user_id,
      "secp256k1",
    );
    if (secp256k1WalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveWalletByUserIdAndCurveType (secp256k1) error: ${secp256k1WalletRes.err}`,
      };
    }

    const ed25519WalletRes = await getActiveWalletByUserIdAndCurveType(
      db,
      getUserRes.data.user_id,
      "ed25519",
    );
    if (ed25519WalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveWalletByUserIdAndCurveType (ed25519) error: ${ed25519WalletRes.err}`,
      };
    }

    if (secp256k1WalletRes.data === null || ed25519WalletRes.data === null) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: `Wallet not found`,
      };
    }

    const secp256k1Wallet = secp256k1WalletRes.data;
    const ed25519Wallet = ed25519WalletRes.data;

    // Decrypt ed25519 share to get server's verifying_share
    const decryptedEd25519Share = await decryptDataAsync(
      ed25519Wallet.enc_tss_share.toString("utf-8"),
      encryptionSecret,
    );
    const ed25519SharesData = JSON.parse(decryptedEd25519Share) as {
      signing_share: number[];
      verifying_share: number[];
    };
    const serverVerifyingShareEd25519Hex = Buffer.from(
      ed25519SharesData.verifying_share,
    ).toString("hex");

    const tokenResult = generateUserTokenV2({
      wallet_id_secp256k1: secp256k1Wallet.wallet_id,
      wallet_id_ed25519: ed25519Wallet.wallet_id,
      email: getUserRes.data.email,
      jwt_config,
    });

    if (tokenResult.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `generateUserToken error: ${tokenResult.err}`,
      };
    }

    if (customerId) {
      saveUserCustomerConnection(
        db,
        logger,
        getUserRes.data.user_id,
        customerId,
      )
        .catch((err) => {
          logger.error(`signInV2 error inserting user-customer connection: ${err}`);
        });
    }

    return {
      success: true,
      data: {
        token: tokenResult.data.token,
        user: {
          wallet_id_secp256k1: secp256k1Wallet.wallet_id,
          wallet_id_ed25519: ed25519Wallet.wallet_id,
          public_key_secp256k1: secp256k1Wallet.public_key.toString("hex"),
          public_key_ed25519: ed25519Wallet.public_key.toString("hex"),
          server_verifying_share_ed25519: serverVerifyingShareEd25519Hex,
          user_identifier: user_identifier,
          email: email ?? null,
          name: name ?? null,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `signInV2 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function checkEmailV2(
  db: Pool,
  email: string,
  auth_type: AuthType,
): Promise<OkoApiResponse<CheckEmailResponseV2>> {
  try {
    // Check if user exists
    const getUserRes = await getUserByEmailAndAuthType(db, email, auth_type);
    if (getUserRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getUserByEmailAndAuthType error: ${getUserRes.err}`,
      };
    }
    const user = getUserRes.data;

    const getActiveKSNodesRes = await getActiveKSNodes(db);
    if (getActiveKSNodesRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveKSNodes error: ${getActiveKSNodesRes.err}`,
      };
    }
    const activeKSNodes = getActiveKSNodesRes.data;

    // Get global threshold (needed for all cases)
    const getKeyshareNodeMetaRes = await getKeyShareNodeMeta(db);
    if (getKeyshareNodeMetaRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getKeyShareNodeMeta error: ${getKeyshareNodeMetaRes.err}`,
      };
    }
    const globalThreshold = getKeyshareNodeMetaRes.data.sss_threshold;
    const activeNodesBelowThreshold = activeKSNodes.length < globalThreshold;

    // Case 1: User doesn't exist
    if (user === null) {
      return {
        success: true,
        data: {
          exists: false,
          active_nodes_below_threshold: activeNodesBelowThreshold,
          keyshare_node_meta: {
            threshold: globalThreshold,
            nodes: activeKSNodes.map((ksNode) => ({
              name: ksNode.node_name,
              endpoint: ksNode.server_url,
              wallet_status: "NOT_REGISTERED",
            })),
          },
        },
      };
    }

    // User exists -> check wallets
    const secp256k1WalletRes = await getActiveWalletByUserIdAndCurveType(
      db,
      user.user_id,
      "secp256k1",
    );
    if (secp256k1WalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveWalletByUserIdAndCurveType (secp256k1) error: ${secp256k1WalletRes.err}`,
      };
    }

    const ed25519WalletRes = await getActiveWalletByUserIdAndCurveType(
      db,
      user.user_id,
      "ed25519",
    );
    if (ed25519WalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveWalletByUserIdAndCurveType (ed25519) error: ${ed25519WalletRes.err}`,
      };
    }

    const secp256k1Wallet = secp256k1WalletRes.data;
    const ed25519Wallet = ed25519WalletRes.data;

    // Case 2: User exists but only secp256k1 wallet exists (ed25519 doesn't exist)
    // Returns secp256k1-based unified info. Client should: 1) ed25519 keygen, 2) reshare if needed
    if (secp256k1Wallet !== null && ed25519Wallet === null) {
      const secp256k1CheckInfoRes = await calculateSecp256k1OnlyCheckInfo(
        db,
        secp256k1Wallet,
        activeKSNodes,
        globalThreshold,
      );
      if (!secp256k1CheckInfoRes.success) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: secp256k1CheckInfoRes.err,
        };
      }

      return {
        success: true,
        data: {
          exists: true,
          needs_keygen_ed25519: true,
          ...secp256k1CheckInfoRes.data,
        },
      };
    }

    // Case 3: User exists and both wallets exist
    if (secp256k1Wallet !== null && ed25519Wallet !== null) {
      const unifiedCheckInfoRes = await calculateUnifiedCheckInfo(
        db,
        secp256k1Wallet,
        ed25519Wallet,
        activeKSNodes,
        globalThreshold,
      );
      if (!unifiedCheckInfoRes.success) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: unifiedCheckInfoRes.err,
        };
      }

      return {
        success: true,
        data: {
          exists: true,
          ...unifiedCheckInfoRes.data,
        },
      };
    }

    // Case 4: User exists but no wallets exist (shouldn't happen, but handle it)
    return {
      success: true,
      data: {
        exists: false,
        active_nodes_below_threshold: activeNodesBelowThreshold,
        keyshare_node_meta: {
          threshold: globalThreshold,
          nodes: activeKSNodes.map((ksNode) => ({
            name: ksNode.node_name,
            endpoint: ksNode.server_url,
            wallet_status: "NOT_REGISTERED",
          })),
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `checkEmail error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function updateWalletKSNodesForReshareV2(
  db: Pool,
  email: string,
  auth_type: AuthType,
  input: {
    secp256k1PublicKey: Bytes33;
    ed25519PublicKey: Bytes32;
    resharedKeyShares: Array<{ name: string; endpoint: string }>;
  },
): Promise<OkoApiResponse<void>> {
  try {
    const { secp256k1PublicKey, ed25519PublicKey, resharedKeyShares } = input;

    // Get user
    const getUserRes = await getUserByEmailAndAuthType(db, email, auth_type);
    if (!getUserRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getUserByEmailAndAuthType error: ${getUserRes.err}`,
      };
    }
    if (getUserRes.data === null) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: `User not found: ${email}`,
      };
    }
    const user: User = getUserRes.data;
    if (user.status !== "ACTIVE") {
      return {
        success: false,
        code: "FORBIDDEN",
        msg: `User is not active: ${email}`,
      };
    }

    // Validate KS nodes
    const serverUrls = Array.from(
      new Set(resharedKeyShares.map((n) => n.endpoint)),
    );
    const getKSNodesRes = await getKSNodesByServerUrl(db, serverUrls);
    if (!getKSNodesRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getKSNodesByServerUrl error: ${getKSNodesRes.err}`,
      };
    }
    if (getKSNodesRes.data.length !== serverUrls.length) {
      return {
        success: false,
        code: "KS_NODE_NOT_FOUND",
        msg: "Unknown server_urls detected",
      };
    }
    const nodeIds = getKSNodesRes.data.map((n) => n.node_id);

    // Check key shares exist on KS nodes
    const checkRes = await checkKeyShareFromKSNodesV2(
      email,
      { secp256k1: secp256k1PublicKey, ed25519: ed25519PublicKey },
      getKSNodesRes.data,
      auth_type,
    );
    if (!checkRes.success) {
      return checkRes;
    }

    // Validate secp256k1 wallet
    const secp256k1WalletRes = await getWalletByPublicKey(
      db,
      Buffer.from(secp256k1PublicKey.toUint8Array()),
    );
    if (!secp256k1WalletRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getWalletByPublicKey (secp256k1) error: ${secp256k1WalletRes.err}`,
      };
    }
    if (secp256k1WalletRes.data === null) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "secp256k1 wallet not found",
      };
    }
    if (secp256k1WalletRes.data.user_id !== user.user_id) {
      return {
        success: false,
        code: "FORBIDDEN",
        msg: "secp256k1 wallet user_id mismatch",
      };
    }

    // Validate ed25519 wallet
    const ed25519WalletRes = await getWalletByPublicKey(
      db,
      Buffer.from(ed25519PublicKey.toUint8Array()),
    );
    if (!ed25519WalletRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getWalletByPublicKey (ed25519) error: ${ed25519WalletRes.err}`,
      };
    }
    if (ed25519WalletRes.data === null) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "ed25519 wallet not found",
      };
    }
    if (ed25519WalletRes.data.user_id !== user.user_id) {
      return {
        success: false,
        code: "FORBIDDEN",
        msg: "ed25519 wallet user_id mismatch",
      };
    }

    // Upsert wallet_ks_nodes for both wallets
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const secp256k1UpsertRes = await upsertWalletKSNodes(
        client,
        secp256k1WalletRes.data.wallet_id,
        nodeIds,
      );
      if (!secp256k1UpsertRes.success) {
        throw new Error(`(secp256k1) ${secp256k1UpsertRes.err}`);
      }

      const ed25519UpsertRes = await upsertWalletKSNodes(
        client,
        ed25519WalletRes.data.wallet_id,
        nodeIds,
      );
      if (!ed25519UpsertRes.success) {
        throw new Error(`(ed25519) ${ed25519UpsertRes.err}`);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `upsertWalletKSNodes error: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      client.release();
    }

    return { success: true, data: void 0 };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `updateWalletKSNodesForReshare error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export interface UnifiedCheckInfo {
  keyshare_node_meta: KeyShareNodeMetaWithNodeStatusInfo;
  needs_reshare: boolean;
  reshare_reasons?: ReshareReason[];
  active_nodes_below_threshold: boolean;
}

async function calculateUnifiedCheckInfo(
  db: Pool,
  secp256k1Wallet: Wallet,
  ed25519Wallet: Wallet,
  activeKSNodes: KeyShareNode[],
  globalThreshold: number,
): Promise<Result<UnifiedCheckInfo, string>> {
  const [secp256k1NodesRes, ed25519NodesRes] = await Promise.all([
    getWalletKSNodesByWalletId(db, secp256k1Wallet.wallet_id),
    getWalletKSNodesByWalletId(db, ed25519Wallet.wallet_id),
  ]);

  if (!secp256k1NodesRes.success) {
    return {
      success: false,
      err: `getWalletKSNodesByWalletId (secp256k1): ${secp256k1NodesRes.err}`,
    };
  }
  if (!ed25519NodesRes.success) {
    return {
      success: false,
      err: `getWalletKSNodesByWalletId (ed25519): ${ed25519NodesRes.err}`,
    };
  }

  const activeKSNodeIds = new Set(activeKSNodes.map((n) => n.node_id));

  // Build status maps for each wallet
  const secp256k1StatusMap = new Map<string, WalletKSNodeStatus>();
  const ed25519StatusMap = new Map<string, WalletKSNodeStatus>();

  for (const node of secp256k1NodesRes.data) {
    secp256k1StatusMap.set(node.node_id, node.status);
  }
  for (const node of ed25519NodesRes.data) {
    ed25519StatusMap.set(node.node_id, node.status);
  }

  const reshare_reasons: ReshareReason[] = [];
  let hasUnrecoverable = false;
  let hasNewNode = false;
  let activeNodeCount = 0;

  const unifiedNodes = activeKSNodes.map((ksNode) => {
    const s1 = secp256k1StatusMap.get(ksNode.node_id) ?? "NOT_REGISTERED";
    const s2 = ed25519StatusMap.get(ksNode.node_id) ?? "NOT_REGISTERED";
    const unifiedStatus = STATUS_SEVERITY[s1] > STATUS_SEVERITY[s2] ? s1 : s2;

    if (unifiedStatus === "UNRECOVERABLE_DATA_LOSS") {
      hasUnrecoverable = true;
    }
    if (unifiedStatus === "NOT_REGISTERED") {
      hasNewNode = true;
    }
    if (unifiedStatus === "ACTIVE" && activeKSNodeIds.has(ksNode.node_id)) {
      activeNodeCount++;
    }

    return {
      name: ksNode.node_name,
      endpoint: ksNode.server_url,
      wallet_status: unifiedStatus,
    };
  });

  if (hasUnrecoverable) {
    reshare_reasons.push("UNRECOVERABLE_NODE_DATA_LOSS");
  }
  if (hasNewNode) {
    reshare_reasons.push("NEW_NODE_ADDED");
  }

  const needsReshare = reshare_reasons.length > 0;

  return {
    success: true,
    data: {
      keyshare_node_meta: {
        threshold: globalThreshold,
        nodes: unifiedNodes,
      },
      needs_reshare: needsReshare,
      reshare_reasons: needsReshare ? reshare_reasons : undefined,
      active_nodes_below_threshold: activeNodeCount < globalThreshold,
    },
  };
}

async function calculateSecp256k1OnlyCheckInfo(
  db: Pool,
  secp256k1Wallet: Wallet,
  activeKSNodes: KeyShareNode[],
  globalThreshold: number,
): Promise<Result<UnifiedCheckInfo, string>> {
  const nodesRes = await getWalletKSNodesByWalletId(
    db,
    secp256k1Wallet.wallet_id,
  );
  if (!nodesRes.success) {
    return {
      success: false,
      err: `getWalletKSNodesByWalletId: ${nodesRes.err}`,
    };
  }

  const activeKSNodeIds = new Set(activeKSNodes.map((n) => n.node_id));
  const statusMap = new Map<string, WalletKSNodeStatus>();
  let activeNodeCount = 0;

  for (const node of nodesRes.data) {
    statusMap.set(node.node_id, node.status);
    if (node.status === "ACTIVE" && activeKSNodeIds.has(node.node_id)) {
      activeNodeCount++;
    }
  }

  const reshare_reasons: ReshareReason[] = [];
  let hasUnrecoverable = false;
  let hasNewNode = false;

  const nodes = activeKSNodes.map((ksNode) => {
    const status = statusMap.get(ksNode.node_id) ?? "NOT_REGISTERED";
    if (status === "UNRECOVERABLE_DATA_LOSS") {
      hasUnrecoverable = true;
    }
    if (status === "NOT_REGISTERED") {
      hasNewNode = true;
    }
    return {
      name: ksNode.node_name,
      endpoint: ksNode.server_url,
      wallet_status: status,
    };
  });

  if (hasUnrecoverable) {
    reshare_reasons.push("UNRECOVERABLE_NODE_DATA_LOSS");
  }
  if (hasNewNode) {
    reshare_reasons.push("NEW_NODE_ADDED");
  }

  const needsReshare = reshare_reasons.length > 0;

  return {
    success: true,
    data: {
      keyshare_node_meta: { threshold: globalThreshold, nodes },
      needs_reshare: needsReshare,
      reshare_reasons: needsReshare ? reshare_reasons : undefined,
      active_nodes_below_threshold: activeNodeCount < globalThreshold,
    },
  };
}

/**
 * Report key share not found from KS nodes.
 * Updates wallet_ks_nodes status to UNRECOVERABLE_DATA_LOSS.
 * Called when client receives KEY_SHARE_NOT_FOUND from a node that was expected to be ACTIVE.
 *
 * Server-side verification: Before marking nodes as data loss, the server
 * directly verifies with each KSN node to confirm the keyshare is actually missing.
 */
export async function reportKeyShareNotFoundV2(
  db: Pool,
  request: ReportKeyShareNotFoundRequest,
  logger: Logger,
): Promise<OkoApiResponse<ReportKeyShareNotFoundResponse>> {
  try {
    const { wallet_id_secp256k1, wallet_id_ed25519, nodes } = request;

    if (nodes.length === 0) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "No nodes provided",
      };
    }

    // 1. Get wallet info with email and auth_type
    const [secp256k1WalletRes, ed25519WalletRes] = await Promise.all([
      getWalletByIdWithAuthInfo(db, wallet_id_secp256k1),
      getWalletByIdWithAuthInfo(db, wallet_id_ed25519),
    ]);

    if (!secp256k1WalletRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getWalletByIdWithAuthInfo (secp256k1): ${secp256k1WalletRes.err}`,
      };
    }
    if (!ed25519WalletRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getWalletByIdWithAuthInfo (ed25519): ${ed25519WalletRes.err}`,
      };
    }

    const secp256k1Wallet = secp256k1WalletRes.data;
    const ed25519Wallet = ed25519WalletRes.data;

    if (!secp256k1Wallet || !ed25519Wallet) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "Wallet not found",
      };
    }

    // Validate that both wallets belong to the same user
    if (
      secp256k1Wallet.email !== ed25519Wallet.email ||
      secp256k1Wallet.auth_type !== ed25519Wallet.auth_type
    ) {
      return {
        success: false,
        code: "FORBIDDEN",
        msg: "Wallet user mismatch",
      };
    }

    const userEmail = secp256k1Wallet.email;
    const authType = secp256k1Wallet.auth_type as AuthType;
    const secp256k1PublicKeyRes = Bytes.fromUint8Array(
      new Uint8Array(secp256k1Wallet.public_key),
      33,
    );
    const ed25519PublicKeyRes = Bytes.fromUint8Array(
      new Uint8Array(ed25519Wallet.public_key),
      32,
    );

    if (!secp256k1PublicKeyRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Invalid secp256k1 public key: ${secp256k1PublicKeyRes.err}`,
      };
    }
    if (!ed25519PublicKeyRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Invalid ed25519 public key: ${ed25519PublicKeyRes.err}`,
      };
    }

    const secp256k1PublicKey = secp256k1PublicKeyRes.data;
    const ed25519PublicKey = ed25519PublicKeyRes.data;

    // 2. Validate nodes exist and get their IDs
    const serverUrls = nodes.map((n) => n.endpoint);
    const ksNodesRes = await getKSNodesByServerUrl(db, serverUrls);
    if (!ksNodesRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: ksNodesRes.err,
      };
    }

    const ksNodes = ksNodesRes.data;
    if (ksNodes.length === 0) {
      return {
        success: false,
        code: "KS_NODE_NOT_FOUND",
        msg: "No valid nodes found",
      };
    }

    // 3. Server-side verification: Check each node to confirm keyshare is missing
    const verifiedMissingNodeIds: string[] = [];

    const verifyResults = await Promise.allSettled(
      ksNodes.map(async (ksNode) => {
        const checkRes = await requestCheckKeyShareV2(
          ksNode.server_url,
          userEmail,
          authType,
          {
            secp256k1: secp256k1PublicKey,
            ed25519: ed25519PublicKey,
          },
        );

        return {
          nodeId: ksNode.node_id,
          nodeName: ksNode.node_name,
          checkRes,
        };
      }),
    );

    for (const result of verifyResults) {
      if (result.status === "rejected") {
        // Node is unreachable - treat as potential data loss
        logger.warn(
          `KSN node unreachable during verification: ${result.reason}`,
        );
        continue;
      }

      const { nodeId, nodeName, checkRes } = result.value;

      if (!checkRes.success) {
        // Error checking - log but don't mark as data loss without confirmation
        logger.warn(`KSN check failed for node ${nodeName}: ${checkRes.msg}`);
        continue;
      }

      // Only mark as data loss if keyshare is confirmed missing
      const secp256k1Missing = !checkRes.data.secp256k1?.exists;
      const ed25519Missing = !checkRes.data.ed25519?.exists;

      if (secp256k1Missing || ed25519Missing) {
        verifiedMissingNodeIds.push(nodeId);
      }
    }

    if (verifiedMissingNodeIds.length === 0) {
      return {
        success: true,
        data: {
          updated_count_secp256k1: 0,
          updated_count_ed25519: 0,
        },
      };
    }

    // 4. Update both wallets' ks_nodes status only for verified missing nodes
    const updateSecp256k1Res = await updateWalletKSNodeStatusToDataLoss(
      db,
      wallet_id_secp256k1,
      verifiedMissingNodeIds,
    );
    if (!updateSecp256k1Res.success) {
      logger.error(
        "Failed to update secp256k1 wallet ks nodes",
        updateSecp256k1Res.err,
      );
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: updateSecp256k1Res.err,
      };
    }

    const updateEd25519Res = await updateWalletKSNodeStatusToDataLoss(
      db,
      wallet_id_ed25519,
      verifiedMissingNodeIds,
    );
    if (!updateEd25519Res.success) {
      logger.error(
        "Failed to update ed25519 wallet ks nodes",
        updateEd25519Res.err,
      );
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: updateEd25519Res.err,
      };
    }

    return {
      success: true,
      data: {
        updated_count_secp256k1: updateSecp256k1Res.data,
        updated_count_ed25519: updateEd25519Res.data,
      },
    };
  } catch (error) {
    logger.error("reportKeyShareNotFoundV2 error", error);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: String(error),
    };
  }
}
