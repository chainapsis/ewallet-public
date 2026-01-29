import { Pool } from "pg";
import type { Logger } from "winston";
import {
  getActiveWalletByUserIdAndCurveType,
  getWalletByPublicKey,
} from "@oko-wallet/oko-pg-interface/oko_wallets";
import type {
  CheckEmailResponseV2,
  ReshareReason,
  SignInResponseV2,
  User,
  WalletCheckInfo,
} from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import { getUserByEmailAndAuthType, updateUserMetadata } from "@oko-wallet/oko-pg-interface/oko_users";
import {
  getActiveKSNodes,
  getWalletKSNodesByWalletId,
  getKSNodesByServerUrl,
  upsertWalletKSNodes,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import type {
  WalletKSNodeWithNodeNameAndServerUrl,
  WalletKSNodeStatus,
  KeyShareNode,
} from "@oko-wallet/oko-types/tss";
import { getKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";
import type { Wallet } from "@oko-wallet/oko-types/wallets";
import type { Bytes32, Bytes33 } from "@oko-wallet/bytes";
import { decryptDataAsync } from "@oko-wallet/crypto-js/node";

import { generateUserTokenV2 } from "@oko-wallet-api/api/tss/keplr_auth";
import { checkKeyShareFromKSNodesV2 } from "@oko-wallet-api/api/tss/ks_node";

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
      const updateMetadataRes = await updateUserMetadata(db, getUserRes.data.user_id, metadata);
      if (updateMetadataRes.success === false) {
        logger.error(`Failed to update user metadata: ${updateMetadataRes.err}`);
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
    if (secp256k1Wallet !== null && ed25519Wallet === null) {
      const secp256k1CheckInfo = await calculateWalletCheckInfo(
        db,
        secp256k1Wallet,
        activeKSNodes,
      );
      if (secp256k1CheckInfo === null) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `calculateWalletCheckInfo (secp256k1) error`,
        };
      }

      return {
        success: true,
        data: {
          exists: true,
          active_nodes_below_threshold: activeNodesBelowThreshold,
          needs_keygen_ed25519: true,
          secp256k1: secp256k1CheckInfo,
          keyshare_node_meta: {
            threshold: globalThreshold,
            nodes: activeKSNodes.map((ksNode) => ({
              name: ksNode.node_name,
              endpoint: ksNode.server_url,
              wallet_status: "NOT_REGISTERED" as const,
            })),
          },
        },
      };
    }

    // Case 3: User exists and both wallets exist
    if (secp256k1Wallet !== null && ed25519Wallet !== null) {
      const secp256k1CheckInfo = await calculateWalletCheckInfo(
        db,
        secp256k1Wallet,
        activeKSNodes,
      );
      if (secp256k1CheckInfo === null) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `calculateWalletCheckInfo (secp256k1) error`,
        };
      }

      const ed25519CheckInfo = await calculateWalletCheckInfo(
        db,
        ed25519Wallet,
        activeKSNodes,
      );
      if (ed25519CheckInfo === null) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `calculateWalletCheckInfo (ed25519) error`,
        };
      }

      return {
        success: true,
        data: {
          exists: true,
          secp256k1: secp256k1CheckInfo,
          ed25519: ed25519CheckInfo,
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

interface ReshareWalletInfoWithBytes {
  publicKey: Bytes33 | Bytes32;
  resharedKeyShares: Array<{ name: string; endpoint: string }>;
}

export async function updateWalletKSNodesForReshareV2(
  db: Pool,
  email: string,
  auth_type: AuthType,
  wallets: {
    secp256k1?: ReshareWalletInfoWithBytes;
    ed25519?: ReshareWalletInfoWithBytes;
  },
): Promise<OkoApiResponse<void>> {
  try {
    if (!wallets.secp256k1 && !wallets.ed25519) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "At least one wallet (secp256k1 or ed25519) must be provided",
      };
    }

    const getUserRes = await getUserByEmailAndAuthType(db, email, auth_type);
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
        msg: `User not found: ${email} (auth_type: ${auth_type})`,
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

    // Collect upsert data after validation
    const upsertData: Array<{
      walletType: "secp256k1" | "ed25519";
      walletId: string;
      nodeIds: string[];
    }> = [];

    // Validate secp256k1 wallet if provided
    if (wallets.secp256k1) {
      const secp256k1ServerUrls = Array.from(
        new Set(wallets.secp256k1.resharedKeyShares.map((n) => n.endpoint)),
      );
      const getSecp256k1KSNodesRes = await getKSNodesByServerUrl(
        db,
        secp256k1ServerUrls,
      );
      if (getSecp256k1KSNodesRes.success === false) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `getKSNodesByServerUrl (secp256k1) error: ${getSecp256k1KSNodesRes.err}`,
        };
      }
      if (getSecp256k1KSNodesRes.data.length !== secp256k1ServerUrls.length) {
        return {
          success: false,
          code: "KS_NODE_NOT_FOUND",
          msg: "unknown server_urls detected for secp256k1",
        };
      }

      const checkSecp256k1Res = await checkKeyShareFromKSNodesV2(
        email,
        { secp256k1: wallets.secp256k1.publicKey as Bytes33 },
        getSecp256k1KSNodesRes.data,
        auth_type,
      );
      if (checkSecp256k1Res.success === false) {
        return checkSecp256k1Res;
      }

      const walletRes = await getWalletByPublicKey(
        db,
        Buffer.from(wallets.secp256k1.publicKey.toUint8Array()),
      );
      if (walletRes.success === false) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `getWalletByPublicKey (secp256k1) error: ${walletRes.err}`,
        };
      }
      if (walletRes.data === null) {
        return {
          success: false,
          code: "WALLET_NOT_FOUND",
          msg: `Secp256k1 wallet not found: ${email}`,
        };
      }

      const wallet: Wallet = walletRes.data;
      if (wallet.status !== "ACTIVE") {
        return {
          success: false,
          code: "FORBIDDEN",
          msg: `Secp256k1 wallet is not active: ${wallet.public_key.toString("hex")}`,
        };
      }

      if (wallet.user_id !== user.user_id) {
        return {
          success: false,
          code: "FORBIDDEN",
          msg: `Secp256k1 wallet user_id mismatch: ${email}`,
        };
      }

      if (wallet.curve_type !== "secp256k1") {
        return {
          success: false,
          code: "FORBIDDEN",
          msg: `Wallet curve type mismatch: expected secp256k1, got ${wallet.curve_type}`,
        };
      }

      if (checkSecp256k1Res.data.secp256k1) {
        upsertData.push({
          walletType: "secp256k1",
          walletId: wallet.wallet_id,
          nodeIds: checkSecp256k1Res.data.secp256k1.nodeIds,
        });
      }
    }

    // Validate ed25519 wallet if provided
    if (wallets.ed25519) {
      const ed25519ServerUrls = Array.from(
        new Set(wallets.ed25519.resharedKeyShares.map((n) => n.endpoint)),
      );
      const getEd25519KSNodesRes = await getKSNodesByServerUrl(
        db,
        ed25519ServerUrls,
      );
      if (getEd25519KSNodesRes.success === false) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `getKSNodesByServerUrl (ed25519) error: ${getEd25519KSNodesRes.err}`,
        };
      }
      if (getEd25519KSNodesRes.data.length !== ed25519ServerUrls.length) {
        return {
          success: false,
          code: "KS_NODE_NOT_FOUND",
          msg: "unknown server_urls detected for ed25519",
        };
      }

      const checkEd25519Res = await checkKeyShareFromKSNodesV2(
        email,
        { ed25519: wallets.ed25519.publicKey as Bytes32 },
        getEd25519KSNodesRes.data,
        auth_type,
      );
      if (checkEd25519Res.success === false) {
        return checkEd25519Res;
      }

      const walletRes = await getWalletByPublicKey(
        db,
        Buffer.from(wallets.ed25519.publicKey.toUint8Array()),
      );
      if (walletRes.success === false) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `getWalletByPublicKey (ed25519) error: ${walletRes.err}`,
        };
      }
      if (walletRes.data === null) {
        return {
          success: false,
          code: "WALLET_NOT_FOUND",
          msg: `Ed25519 wallet not found: ${email}`,
        };
      }

      const wallet: Wallet = walletRes.data;
      if (wallet.status !== "ACTIVE") {
        return {
          success: false,
          code: "FORBIDDEN",
          msg: `Ed25519 wallet is not active: ${wallet.public_key.toString("hex")}`,
        };
      }

      if (wallet.user_id !== user.user_id) {
        return {
          success: false,
          code: "FORBIDDEN",
          msg: `Ed25519 wallet user_id mismatch: ${email}`,
        };
      }

      if (wallet.curve_type !== "ed25519") {
        return {
          success: false,
          code: "FORBIDDEN",
          msg: `Wallet curve type mismatch: expected ed25519, got ${wallet.curve_type}`,
        };
      }

      if (checkEd25519Res.data.ed25519) {
        upsertData.push({
          walletType: "ed25519",
          walletId: wallet.wallet_id,
          nodeIds: checkEd25519Res.data.ed25519.nodeIds,
        });
      }
    }

    // Run upserts in a transaction
    if (upsertData.length > 0) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");

        for (const data of upsertData) {
          const upsertRes = await upsertWalletKSNodes(
            client,
            data.walletId,
            data.nodeIds,
          );
          if (upsertRes.success === false) {
            throw new Error(`(${data.walletType}) ${upsertRes.err}`);
          }
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
    }

    return {
      success: true,
      data: void 0,
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `updateWalletKSNodesForReshare error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function calculateWalletCheckInfo(
  db: Pool,
  wallet: Wallet,
  activeKSNodes: KeyShareNode[],
): Promise<WalletCheckInfo | null> {
  const getAllWalletKSNodesRes = await getWalletKSNodesByWalletId(
    db,
    wallet.wallet_id,
  );
  if (getAllWalletKSNodesRes.success === false) {
    return null;
  }

  const activeKSNodeIds = new Set(activeKSNodes.map((n) => n.node_id));
  const walletNodeIds = new Set<string>();
  const walletKSNodeStatusMap = new Map<string, WalletKSNodeStatus>();
  const activeWalletKSNodes: WalletKSNodeWithNodeNameAndServerUrl[] = [];
  let unrecoverableExists = false;
  const newNodeIds: string[] = [];

  for (const node of getAllWalletKSNodesRes.data) {
    walletNodeIds.add(node.node_id);
    walletKSNodeStatusMap.set(node.node_id, node.status);

    if (node.status === "ACTIVE" && activeKSNodeIds.has(node.node_id)) {
      activeWalletKSNodes.push(node);
    }

    if (node.status === "UNRECOVERABLE_DATA_LOSS") {
      unrecoverableExists = true;
    }
  }

  // Find new nodes (active nodes not in wallet)
  for (const node of activeKSNodes) {
    if (!walletNodeIds.has(node.node_id)) {
      newNodeIds.push(node.node_id);
    }
  }

  // Calculate reshare requirements
  const reshare_reasons: ReshareReason[] = [];
  if (unrecoverableExists) {
    reshare_reasons.push("UNRECOVERABLE_NODE_DATA_LOSS");
  }
  if (newNodeIds.length > 0) {
    reshare_reasons.push("NEW_NODE_ADDED");
  }

  const needsReshare = reshare_reasons.length > 0;
  const activeNodesBelowThreshold =
    activeWalletKSNodes.length < wallet.sss_threshold;

  return {
    keyshare_node_meta: {
      threshold: wallet.sss_threshold,
      nodes: activeKSNodes.map((ksNode) => ({
        name: ksNode.node_name,
        endpoint: ksNode.server_url,
        wallet_status: needsReshare
          ? (walletKSNodeStatusMap.get(ksNode.node_id) ?? "NOT_REGISTERED")
          : "ACTIVE",
      })),
    },
    needs_reshare: needsReshare,
    reshare_reasons: needsReshare ? reshare_reasons : undefined,
    active_nodes_below_threshold: activeNodesBelowThreshold,
  };
}
