import type {
  KeyShareNodeMetaWithNodeStatusInfo,
  NodeStatusInfo,
} from "@oko-wallet/oko-types/tss";
import type {
  NodeNameAndEndpoint,
  UserKeySharePointByNode,
  TeddsaKeyShareByNode,
} from "@oko-wallet/oko-types/user_key_share";
import {
  hexToTeddsaKeyShare,
  teddsaKeyShareToHex,
} from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Bytes32, Bytes33 } from "@oko-wallet/bytes";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { PublicKeyPackageRaw } from "@oko-wallet/oko-types/teddsa";
import type { ReshareRequestV2 } from "@oko-wallet/oko-types/user";

import type { ClientCommitRevealSession } from "./commit_reveal/types";
import {
  createKsnCommitRevealParams,
  createOkoApiCommitRevealParams,
} from "./commit_reveal/signature";

import {
  type KeySharesByNode,
  requestKeySharesV2,
  reshareKeySharesV2,
  reshareRegisterV2,
} from "@oko-wallet-attached/requests/ks_node_v2";
import {
  makeAuthorizedOkoApiRequest,
  TSS_V2_ENDPOINT,
} from "@oko-wallet-attached/requests/oko_api";
import {
  decodeKeyShareStringToPoint256,
  encodePoint256ToKeyShareString,
} from "./key_share_utils";
import { runExpandShares } from "./reshare";
import {
  expandTeddsaSigningShare,
  reconstructKeyPackage,
  keyPackageToRaw,
  getClientFrostIdentifier,
  getServerFrostIdentifier,
  combineTeddsaShares,
} from "./sss_ed25519";
import { computeVerifyingShare } from "./scalar";
import { combineUserShares } from "./combine";

/**
 * Convert V2 API response to secp256k1 UserKeySharePointByNode format.
 */
export function convertSecp256k1Shares(
  keySharesByNode: KeySharesByNode[],
): UserKeySharePointByNode[] {
  const result: UserKeySharePointByNode[] = [];
  for (const item of keySharesByNode) {
    const shareHex = item.shares.secp256k1;
    if (!shareHex) {
      continue;
    }

    const point256Res = decodeKeyShareStringToPoint256(shareHex);
    if (!point256Res.success) {
      throw new Error(`secp256k1 decode err: ${point256Res.err}`);
    }
    result.push({
      node: item.node,
      share: point256Res.data,
    });
  }
  return result;
}

/**
 * Convert V2 API response to ed25519 TeddsaKeyShareByNode format.
 */
export function convertEd25519Shares(
  keySharesByNode: KeySharesByNode[],
): TeddsaKeyShareByNode[] {
  const result: TeddsaKeyShareByNode[] = [];
  for (const item of keySharesByNode) {
    const shareHex = item.shares.ed25519;
    if (!shareHex) {
      continue;
    }

    const teddsaShare = hexToTeddsaKeyShare(shareHex);
    result.push({
      node: item.node,
      share: teddsaShare,
    });
  }
  return result;
}

/**
 * Wallet info for secp256k1 reshare.
 */
export interface ReshareWalletInfoSecp256k1 {
  publicKey: Bytes33;
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo;
  needsReshare: boolean; // from checkEmailV2 API response
}

/**
 * Wallet info for ed25519 reshare.
 */
export interface ReshareWalletInfoEd25519 {
  publicKey: Bytes32;
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo;
  serverVerifyingShare: Bytes32;
  needsReshare: boolean; // from checkEmailV2 API response
}

export interface ReshareV2Result {
  keyshare1Secp256k1: string; // hex string
  keyPackageEd25519: string; // hex-encoded KeyPackageRaw JSON
  publicKeyPackageEd25519: string; // hex-encoded PublicKeyPackageRaw JSON
}

export async function reshareUserKeySharesV2(
  idToken: string,
  authType: AuthType,
  secp256k1: ReshareWalletInfoSecp256k1,
  ed25519: ReshareWalletInfoEd25519,
  session: ClientCommitRevealSession,
): Promise<Result<ReshareV2Result, string>> {
  const secp256k1NeedsReshare = secp256k1.needsReshare;
  const ed25519NeedsReshare = ed25519.needsReshare;

  // 1. Classify nodes by status per wallet
  const secp256k1ActiveNodes = secp256k1.keyshareNodeMeta.nodes.filter(
    (n) => n.wallet_status === "ACTIVE",
  );
  const secp256k1AdditionalNodes = secp256k1.keyshareNodeMeta.nodes.filter(
    (n) =>
      n.wallet_status === "NOT_REGISTERED" ||
      n.wallet_status === "UNRECOVERABLE_DATA_LOSS",
  );

  const ed25519ActiveNodes = ed25519.keyshareNodeMeta.nodes.filter(
    (n) => n.wallet_status === "ACTIVE",
  );
  const ed25519AdditionalNodes = ed25519.keyshareNodeMeta.nodes.filter(
    (n) =>
      n.wallet_status === "NOT_REGISTERED" ||
      n.wallet_status === "UNRECOVERABLE_DATA_LOSS",
  );

  // Check threshold for both wallets
  if (secp256k1ActiveNodes.length < secp256k1.keyshareNodeMeta.threshold) {
    return {
      success: false,
      err: "insufficient existing KS nodes for secp256k1",
    };
  }
  if (ed25519ActiveNodes.length < ed25519.keyshareNodeMeta.threshold) {
    return {
      success: false,
      err: "insufficient existing KS nodes for ed25519",
    };
  }

  // 2. Request existing shares from ACTIVE nodes (separately for each wallet)
  const [secp256k1SharesRes, ed25519SharesRes] = await Promise.all([
    requestKeySharesV2(
      idToken,
      secp256k1ActiveNodes,
      secp256k1.keyshareNodeMeta.threshold,
      authType,
      { secp256k1: secp256k1.publicKey.toHex() },
      session,
    ),
    requestKeySharesV2(
      idToken,
      ed25519ActiveNodes,
      ed25519.keyshareNodeMeta.threshold,
      authType,
      { ed25519: ed25519.publicKey.toHex() },
      session,
    ),
  ]);

  if (!secp256k1SharesRes.success) {
    return {
      success: false,
      err: `Failed to request secp256k1 shares: ${secp256k1SharesRes.err.code}`,
    };
  }
  if (!ed25519SharesRes.success) {
    return {
      success: false,
      err: `Failed to request ed25519 shares: ${ed25519SharesRes.err.code}`,
    };
  }

  // 3. Process secp256k1
  let secp256k1Result: {
    originalSecret: string;
    resharedShares?: UserKeySharePointByNode[];
  };

  const secp256k1SharesByNode = convertSecp256k1Shares(secp256k1SharesRes.data);

  if (secp256k1NeedsReshare) {
    // Expand shares for new nodes
    const secp256k1ExpandRes = await runExpandShares(
      secp256k1SharesByNode,
      secp256k1AdditionalNodes,
      secp256k1.keyshareNodeMeta.threshold,
    );
    if (!secp256k1ExpandRes.success) {
      return { success: false, err: secp256k1ExpandRes.err };
    }
    secp256k1Result = {
      originalSecret: secp256k1ExpandRes.data.original_secret.toHex(),
      resharedShares: secp256k1ExpandRes.data.reshared_user_key_shares,
    };
  } else {
    // Just combine shares to recover client's keyshare1
    const combineRes = await combineUserShares(
      secp256k1SharesByNode,
      secp256k1.keyshareNodeMeta.threshold,
    );
    if (!combineRes.success) {
      return { success: false, err: combineRes.err };
    }
    secp256k1Result = {
      originalSecret: combineRes.data,
    };
  }

  // 4. Process ed25519
  let ed25519Result: {
    originalSigningShare: Bytes32;
    resharedShares?: TeddsaKeyShareByNode[];
  };

  const ed25519SharesByNode = convertEd25519Shares(ed25519SharesRes.data);

  if (ed25519NeedsReshare) {
    // Expand shares for new nodes
    const ed25519ExpandRes = await expandTeddsaSigningShare(
      ed25519SharesByNode,
      ed25519AdditionalNodes,
      ed25519.keyshareNodeMeta.threshold,
      ed25519.publicKey,
    );
    if (!ed25519ExpandRes.success) {
      return { success: false, err: ed25519ExpandRes.err };
    }
    ed25519Result = {
      originalSigningShare: ed25519ExpandRes.data.original_signing_share,
      resharedShares: ed25519ExpandRes.data.reshared_shares,
    };
  } else {
    // Just combine shares to recover client's signing share
    const combineRes = await combineTeddsaShares(
      ed25519SharesByNode,
      ed25519.keyshareNodeMeta.threshold,
      ed25519.publicKey,
    );
    if (!combineRes.success) {
      return { success: false, err: combineRes.err };
    }
    ed25519Result = {
      originalSigningShare: combineRes.data,
    };
  }

  // 5. Send new shares to KSN (only for wallets that need reshare)
  // Track reshared nodes per wallet separately
  const secp256k1ResharedNodes: NodeNameAndEndpoint[] = [];
  const ed25519ResharedNodes: NodeNameAndEndpoint[] = [];

  if (secp256k1NeedsReshare || ed25519NeedsReshare) {
    // Collect all nodes that need updates
    const nodesToUpdate = new Map<
      string,
      {
        node: NodeNameAndEndpoint;
        secp256k1?: { share: UserKeySharePointByNode; isNewNode: boolean };
        ed25519?: { share: TeddsaKeyShareByNode; isNewNode: boolean };
      }
    >();

    if (secp256k1NeedsReshare && secp256k1Result.resharedShares) {
      for (const share of secp256k1Result.resharedShares) {
        const nodeStatus = secp256k1.keyshareNodeMeta.nodes.find(
          (n) => n.endpoint === share.node.endpoint,
        )?.wallet_status;
        const isNewNode =
          nodeStatus === "NOT_REGISTERED" ||
          nodeStatus === "UNRECOVERABLE_DATA_LOSS";

        const existing = nodesToUpdate.get(share.node.endpoint) || {
          node: share.node,
        };
        existing.secp256k1 = { share, isNewNode };
        nodesToUpdate.set(share.node.endpoint, existing);
      }
    }

    if (ed25519NeedsReshare && ed25519Result.resharedShares) {
      for (const share of ed25519Result.resharedShares) {
        const nodeStatus = ed25519.keyshareNodeMeta.nodes.find(
          (n) => n.endpoint === share.node.endpoint,
        )?.wallet_status;
        const isNewNode =
          nodeStatus === "NOT_REGISTERED" ||
          nodeStatus === "UNRECOVERABLE_DATA_LOSS";

        const existing = nodesToUpdate.get(share.node.endpoint) || {
          node: share.node,
        };
        existing.ed25519 = { share, isNewNode };
        nodesToUpdate.set(share.node.endpoint, existing);
      }
    }

    // Send updates to each node
    const sendResults = await Promise.all(
      Array.from(nodesToUpdate.values()).map(async (nodeInfo) => {
        const wallets: {
          secp256k1?: { public_key: string; share: string };
          ed25519?: { public_key: string; share: string };
        } = {};

        // Determine if this is a new node (any wallet being registered for first time)
        let isNewNode = false;

        if (nodeInfo.secp256k1) {
          wallets.secp256k1 = {
            public_key: secp256k1.publicKey.toHex(),
            share: encodePoint256ToKeyShareString(
              nodeInfo.secp256k1.share.share,
            ),
          };
          if (nodeInfo.secp256k1.isNewNode) {
            isNewNode = true;
          }
          secp256k1ResharedNodes.push(nodeInfo.node);
        }

        if (nodeInfo.ed25519) {
          wallets.ed25519 = {
            public_key: ed25519.publicKey.toHex(),
            share: teddsaKeyShareToHex(nodeInfo.ed25519.share.share),
          };
          if (nodeInfo.ed25519.isNewNode) {
            isNewNode = true;
          }
          ed25519ResharedNodes.push(nodeInfo.node);
        }

        // Create commit-reveal params for this node
        const apiName = isNewNode ? "reshare_register" : "reshare";
        const commitRevealRes = createKsnCommitRevealParams(
          session,
          nodeInfo.node.endpoint,
          apiName,
          true, // cr_final: true - reshare/reshare_register is the final KSN call
        );
        if (!commitRevealRes.success) {
          return {
            success: false,
            err: commitRevealRes.err,
          } as const;
        }
        const commitRevealParams = commitRevealRes.data;

        if (isNewNode) {
          return reshareRegisterV2(
            nodeInfo.node.endpoint,
            idToken,
            authType,
            wallets,
            commitRevealParams,
          );
        } else {
          return reshareKeySharesV2(
            nodeInfo.node.endpoint,
            idToken,
            authType,
            wallets,
            commitRevealParams,
          );
        }
      }),
    );

    const errResults = sendResults.filter((r) => !r.success);
    if (errResults.length > 0) {
      return {
        success: false,
        err: errResults.map((r) => (r as { err: string }).err).join("\n"),
      };
    }
  }

  // 6. Update Oko API (only if any reshare happened)
  const hasResharedNodes =
    secp256k1ResharedNodes.length > 0 || ed25519ResharedNodes.length > 0;

  if (hasResharedNodes) {
    const reshareWallets: ReshareRequestV2["wallets"] = {};

    if (secp256k1NeedsReshare && secp256k1ResharedNodes.length > 0) {
      reshareWallets.secp256k1 = {
        public_key: secp256k1.publicKey.toHex(),
        reshared_key_shares: secp256k1ResharedNodes,
      };
    }
    if (ed25519NeedsReshare && ed25519ResharedNodes.length > 0) {
      reshareWallets.ed25519 = {
        public_key: ed25519.publicKey.toHex(),
        reshared_key_shares: ed25519ResharedNodes,
      };
    }

    // Create commit-reveal params for oko_api reshare
    const reshareCommitRevealRes = createOkoApiCommitRevealParams(
      session,
      "reshare",
      true, // cr_final: true - reshare is the final oko_api call
    );
    if (!reshareCommitRevealRes.success) {
      return { success: false, err: reshareCommitRevealRes.err };
    }

    const updateRes = await makeAuthorizedOkoApiRequest<ReshareRequestV2, void>(
      "user/reshare",
      idToken,
      {
        wallets: reshareWallets,
      },
      TSS_V2_ENDPOINT,
      reshareCommitRevealRes.data,
    );
    if (!updateRes.success) {
      return {
        success: false,
        err: "Failed to update wallet status for reshare",
      };
    }
  }

  // 7. Build result
  const clientIdentifierRes = getClientFrostIdentifier();
  if (!clientIdentifierRes.success) {
    return { success: false, err: clientIdentifierRes.err };
  }

  const serverIdentifierRes = getServerFrostIdentifier();
  if (!serverIdentifierRes.success) {
    return { success: false, err: serverIdentifierRes.err };
  }

  const keyPackage = reconstructKeyPackage(
    ed25519Result.originalSigningShare,
    clientIdentifierRes.data,
    ed25519.publicKey,
    ed25519.keyshareNodeMeta.threshold,
  );

  // Build PublicKeyPackageRaw
  const clientVerifyingShare = computeVerifyingShare(
    ed25519Result.originalSigningShare,
  );
  const publicKeyPackageRaw: PublicKeyPackageRaw = {
    verifying_shares: [
      {
        identifier: clientIdentifierRes.data.toHex(),
        share: [...clientVerifyingShare.toUint8Array()],
      },
      {
        identifier: serverIdentifierRes.data.toHex(),
        share: [...ed25519.serverVerifyingShare.toUint8Array()],
      },
    ],
    verifying_key: [...ed25519.publicKey.toUint8Array()],
  };

  return {
    success: true,
    data: {
      keyshare1Secp256k1: secp256k1Result.originalSecret,
      keyPackageEd25519: Buffer.from(
        JSON.stringify(keyPackageToRaw(keyPackage)),
      ).toString("hex"),
      publicKeyPackageEd25519: Buffer.from(
        JSON.stringify(publicKeyPackageRaw),
      ).toString("hex"),
    },
  };
}

export interface ExpandAndSendReshareParams {
  idToken: string;
  authType: AuthType;
  session: ClientCommitRevealSession;
  nodesNeedingReshare: NodeStatusInfo[];
  secp256k1?: {
    shares: UserKeySharePointByNode[];
    threshold: number;
    publicKey: string;
  };
  ed25519?: {
    shares: TeddsaKeyShareByNode[];
    threshold: number;
    verifyingKey: Bytes32;
    publicKey: string;
  };
}

export interface ExpandAndSendReshareResult {
  keyshare1Secp256k1?: string;
  signingShare?: Bytes32;
}

export async function expandAndSendReshareV2(
  params: ExpandAndSendReshareParams,
): Promise<Result<ExpandAndSendReshareResult, string>> {
  const {
    idToken,
    authType,
    session,
    nodesNeedingReshare,
    secp256k1,
    ed25519,
  } = params;

  // Validate at least one wallet type is provided
  if (!secp256k1 && !ed25519) {
    return {
      success: false,
      err: "At least one of secp256k1 or ed25519 must be provided",
    };
  }

  // 1. Expand secp256k1 shares (if provided)
  let secp256k1ExpandRes:
    | Awaited<ReturnType<typeof runExpandShares>>
    | undefined;
  let keyshare1Secp256k1: string | undefined;

  if (secp256k1) {
    secp256k1ExpandRes = await runExpandShares(
      secp256k1.shares,
      nodesNeedingReshare,
      secp256k1.threshold,
    );
    if (!secp256k1ExpandRes.success) {
      return { success: false, err: secp256k1ExpandRes.err };
    }
    keyshare1Secp256k1 = secp256k1ExpandRes.data.original_secret.toHex();
  }

  // 2. Expand ed25519 shares (if provided)
  let ed25519ExpandRes:
    | Awaited<ReturnType<typeof expandTeddsaSigningShare>>
    | undefined;
  let signingShare: Bytes32 | undefined;

  if (ed25519) {
    ed25519ExpandRes = await expandTeddsaSigningShare(
      ed25519.shares,
      nodesNeedingReshare,
      ed25519.threshold,
      ed25519.verifyingKey,
    );
    if (!ed25519ExpandRes.success) {
      return { success: false, err: ed25519ExpandRes.err };
    }
    signingShare = ed25519ExpandRes.data.original_signing_share;
  }

  // 3. Send reshared shares to nodes needing reshare
  const sendResults = await Promise.all(
    nodesNeedingReshare.map(async (node) => {
      const commitRevealRes = createKsnCommitRevealParams(
        session,
        node.endpoint,
        "reshare_register",
        true, // cr_final: true - reshare_register is the final KSN call
      );
      if (!commitRevealRes.success) {
        return { success: false, err: commitRevealRes.err };
      }

      // Build wallets payload
      const wallets: {
        secp256k1?: { public_key: string; share: string };
        ed25519?: { public_key: string; share: string };
      } = {};

      if (secp256k1 && secp256k1ExpandRes?.success) {
        const share = secp256k1ExpandRes.data.reshared_user_key_shares.find(
          (s) => s.node.endpoint === node.endpoint,
        );
        if (!share) {
          return {
            success: false,
            err: `secp256k1 share not found for node ${node.name}`,
          };
        }
        wallets.secp256k1 = {
          public_key: secp256k1.publicKey,
          share: encodePoint256ToKeyShareString(share.share),
        };
      }

      if (ed25519 && ed25519ExpandRes?.success) {
        const share = ed25519ExpandRes.data.reshared_shares.find(
          (s) => s.node.endpoint === node.endpoint,
        );
        if (!share) {
          return {
            success: false,
            err: `ed25519 share not found for node ${node.name}`,
          };
        }
        wallets.ed25519 = {
          public_key: ed25519.publicKey,
          share: teddsaKeyShareToHex(share.share),
        };
      }

      return reshareRegisterV2(
        node.endpoint,
        idToken,
        authType,
        wallets,
        commitRevealRes.data,
      );
    }),
  );

  const errResults = sendResults.filter((r) => !r.success);
  if (errResults.length > 0) {
    return {
      success: false,
      err: errResults.map((r) => (r as { err: string }).err).join("\n"),
    };
  }

  // 4. Update Oko API reshare status
  const reshareCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "reshare",
    true, // cr_final: true - reshare is the final oko_api call
  );
  if (!reshareCommitRevealRes.success) {
    return { success: false, err: reshareCommitRevealRes.err };
  }

  // Build wallets for oko_api
  const reshareWallets: ReshareRequestV2["wallets"] = {};
  if (secp256k1) {
    reshareWallets.secp256k1 = {
      public_key: secp256k1.publicKey,
      reshared_key_shares: nodesNeedingReshare.map((n) => ({
        name: n.name,
        endpoint: n.endpoint,
      })),
    };
  }
  if (ed25519) {
    reshareWallets.ed25519 = {
      public_key: ed25519.publicKey,
      reshared_key_shares: nodesNeedingReshare.map((n) => ({
        name: n.name,
        endpoint: n.endpoint,
      })),
    };
  }

  const updateRes = await makeAuthorizedOkoApiRequest<ReshareRequestV2, void>(
    "user/reshare",
    idToken,
    { wallets: reshareWallets },
    TSS_V2_ENDPOINT,
    reshareCommitRevealRes.data,
  );
  if (!updateRes.success) {
    console.warn(
      "[reshare_v2] Failed to update reshare status:",
      updateRes.err,
    );
  }

  return {
    success: true,
    data: {
      keyshare1Secp256k1,
      signingShare,
    },
  };
}

/**
 * Parameters for buildKeyPackageResult.
 */
export interface BuildKeyPackageParams {
  signingShare: Bytes32;
  verifyingKey: Bytes32;
  serverVerifyingShare: Bytes32;
  threshold: number;
}

/**
 * Result of buildKeyPackageResult.
 */
export interface BuildKeyPackageResult {
  keyPackageEd25519: string; // hex-encoded KeyPackageRaw JSON
  publicKeyPackageEd25519: string; // hex-encoded PublicKeyPackageRaw JSON
}

/**
 * Build KeyPackage and PublicKeyPackage from signing share.
 *
 * This is the common logic for reconstructing ed25519 key packages
 * after combining or expanding shares.
 */
export function buildKeyPackageResult(
  params: BuildKeyPackageParams,
): Result<BuildKeyPackageResult, string> {
  const { signingShare, verifyingKey, serverVerifyingShare, threshold } =
    params;

  const clientIdentifierRes = getClientFrostIdentifier();
  if (!clientIdentifierRes.success) {
    return { success: false, err: clientIdentifierRes.err };
  }

  const serverIdentifierRes = getServerFrostIdentifier();
  if (!serverIdentifierRes.success) {
    return { success: false, err: serverIdentifierRes.err };
  }

  const keyPackage = reconstructKeyPackage(
    signingShare,
    clientIdentifierRes.data,
    verifyingKey,
    threshold,
  );

  const clientVerifyingShare = computeVerifyingShare(signingShare);
  const publicKeyPackageRaw: PublicKeyPackageRaw = {
    verifying_shares: [
      {
        identifier: clientIdentifierRes.data.toHex(),
        share: [...clientVerifyingShare.toUint8Array()],
      },
      {
        identifier: serverIdentifierRes.data.toHex(),
        share: [...serverVerifyingShare.toUint8Array()],
      },
    ],
    verifying_key: [...verifyingKey.toUint8Array()],
  };

  return {
    success: true,
    data: {
      keyPackageEd25519: Buffer.from(
        JSON.stringify(keyPackageToRaw(keyPackage)),
      ).toString("hex"),
      publicKeyPackageEd25519: Buffer.from(
        JSON.stringify(publicKeyPackageRaw),
      ).toString("hex"),
    },
  };
}
