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
  requestKeyShares,
  reshareKeySharesV2,
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
      throw new Error(`secp256k1 share missing from node: ${item.node.name}`);
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
      throw new Error(`ed25519 share missing from node: ${item.node.name}`);
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
}

/**
 * Wallet info for ed25519 reshare.
 */
export interface ReshareWalletInfoEd25519 {
  publicKey: Bytes32;
  serverVerifyingShare: Bytes32;
}

export interface ReshareV2Result {
  keyshare1Secp256k1: string; // hex string
  keyPackageEd25519: string; // hex-encoded KeyPackageRaw JSON
  publicKeyPackageEd25519: string; // hex-encoded PublicKeyPackageRaw JSON
}

export async function reshareUserKeySharesV2(
  idToken: string,
  authType: AuthType,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
  secp256k1: ReshareWalletInfoSecp256k1,
  ed25519: ReshareWalletInfoEd25519,
  session: ClientCommitRevealSession,
): Promise<Result<ReshareV2Result, string>> {
  const { threshold, nodes } = keyshareNodeMeta;

  // 1. Classify nodes by unified status
  const activeNodes = nodes.filter((n) => n.wallet_status === "ACTIVE");
  const additionalNodes = nodes.filter(
    (n) =>
      n.wallet_status === "NOT_REGISTERED" ||
      n.wallet_status === "UNRECOVERABLE_DATA_LOSS",
  );

  // Check threshold
  if (activeNodes.length < threshold) {
    return {
      success: false,
      err: "insufficient existing KS nodes",
    };
  }

  // 2. Request existing shares from ACTIVE nodes
  const sharesRes = await requestKeyShares({
    idToken,
    authType,
    wallets: {
      secp256k1: secp256k1.publicKey.toHex(),
      ed25519: ed25519.publicKey.toHex(),
    },
    threshold,
    session,
    nodes: activeNodes,
  });

  if (!sharesRes.success) {
    return {
      success: false,
      err: `Failed to request shares: ${sharesRes.err.code}`,
    };
  }

  // 3. Process secp256k1
  const secp256k1SharesByNode = convertSecp256k1Shares(sharesRes.data);

  const secp256k1ExpandRes = await runExpandShares(
    secp256k1SharesByNode,
    additionalNodes,
    threshold,
  );
  if (!secp256k1ExpandRes.success) {
    return { success: false, err: secp256k1ExpandRes.err };
  }
  const secp256k1Result = {
    originalSecret: secp256k1ExpandRes.data.original_secret.toHex(),
    resharedShares: secp256k1ExpandRes.data.reshared_user_key_shares,
  };

  // 4. Process ed25519
  const ed25519SharesByNode = convertEd25519Shares(sharesRes.data);

  const ed25519ExpandRes = await expandTeddsaSigningShare(
    ed25519SharesByNode,
    additionalNodes,
    threshold,
    ed25519.publicKey,
  );
  if (!ed25519ExpandRes.success) {
    return { success: false, err: ed25519ExpandRes.err };
  }
  const ed25519Result = {
    originalSigningShare: ed25519ExpandRes.data.original_signing_share,
    resharedShares: ed25519ExpandRes.data.reshared_shares,
  };

  // 5. Send new shares to ALL nodes (unified reshare API handles upsert)
  const allNodes = nodes;
  const resharedNodes: NodeNameAndEndpoint[] = [];

  const sendResults = await Promise.all(
    allNodes.map(async (node) => {
      // Find shares for this node
      const secp256k1Share = secp256k1Result.resharedShares.find(
        (s) => s.node.endpoint === node.endpoint,
      );
      const ed25519Share = ed25519Result.resharedShares.find(
        (s) => s.node.endpoint === node.endpoint,
      );

      if (!secp256k1Share || !ed25519Share) {
        return {
          success: false,
          err: `shares not found for node ${node.name}`,
        } as const;
      }

      const wallets = {
        secp256k1: {
          public_key: secp256k1.publicKey.toHex(),
          share: encodePoint256ToKeyShareString(secp256k1Share.share),
        },
        ed25519: {
          public_key: ed25519.publicKey.toHex(),
          share: teddsaKeyShareToHex(ed25519Share.share),
        },
      };

      // Create commit-reveal params for this node (always use "reshare" - upsert handles new/existing)
      const commitRevealRes = createKsnCommitRevealParams(
        session,
        node.endpoint,
        "reshare",
      );
      if (!commitRevealRes.success) {
        return {
          success: false,
          err: commitRevealRes.err,
        } as const;
      }

      resharedNodes.push({ name: node.name, endpoint: node.endpoint });

      return reshareKeySharesV2(
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

  // 6. Update Oko API
  const reshareCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "reshare",
  );
  if (!reshareCommitRevealRes.success) {
    return { success: false, err: reshareCommitRevealRes.err };
  }

  const updateRes = await makeAuthorizedOkoApiRequest<ReshareRequestV2, void>(
    "user/reshare",
    idToken,
    {
      secp256k1_public_key: secp256k1.publicKey.toHex(),
      ed25519_public_key: ed25519.publicKey.toHex(),
      reshared_key_shares: resharedNodes,
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
    threshold,
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
  secp256k1: {
    shares: UserKeySharePointByNode[];
    threshold: number;
    publicKey: string;
  };
  ed25519: {
    shares: TeddsaKeyShareByNode[];
    threshold: number;
    verifyingKey: Bytes32;
    publicKey: string;
  };
}

export interface ExpandAndSendReshareResult {
  keyshare1Secp256k1: string;
  signingShare: Bytes32;
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

  // 1. Expand secp256k1 shares
  const secp256k1ExpandRes = await runExpandShares(
    secp256k1.shares,
    nodesNeedingReshare,
    secp256k1.threshold,
  );
  if (!secp256k1ExpandRes.success) {
    return { success: false, err: secp256k1ExpandRes.err };
  }
  const keyshare1Secp256k1 = secp256k1ExpandRes.data.original_secret.toHex();

  // 2. Expand ed25519 shares
  const ed25519ExpandRes = await expandTeddsaSigningShare(
    ed25519.shares,
    nodesNeedingReshare,
    ed25519.threshold,
    ed25519.verifyingKey,
  );
  if (!ed25519ExpandRes.success) {
    return { success: false, err: ed25519ExpandRes.err };
  }
  const signingShare = ed25519ExpandRes.data.original_signing_share;

  // 3. Send reshared shares to nodes needing reshare (unified reshare API handles upsert)
  const sendResults = await Promise.all(
    nodesNeedingReshare.map(async (node) => {
      const commitRevealRes = createKsnCommitRevealParams(
        session,
        node.endpoint,
        "reshare",
      );
      if (!commitRevealRes.success) {
        return { success: false, err: commitRevealRes.err };
      }

      // Find shares for this node
      const secp256k1Share =
        secp256k1ExpandRes.data.reshared_user_key_shares.find(
          (s) => s.node.endpoint === node.endpoint,
        );
      if (!secp256k1Share) {
        return {
          success: false,
          err: `secp256k1 share not found for node ${node.name}`,
        };
      }

      const ed25519Share = ed25519ExpandRes.data.reshared_shares.find(
        (s) => s.node.endpoint === node.endpoint,
      );
      if (!ed25519Share) {
        return {
          success: false,
          err: `ed25519 share not found for node ${node.name}`,
        };
      }

      const wallets = {
        secp256k1: {
          public_key: secp256k1.publicKey,
          share: encodePoint256ToKeyShareString(secp256k1Share.share),
        },
        ed25519: {
          public_key: ed25519.publicKey,
          share: teddsaKeyShareToHex(ed25519Share.share),
        },
      };

      return reshareKeySharesV2(
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
  );
  if (!reshareCommitRevealRes.success) {
    return { success: false, err: reshareCommitRevealRes.err };
  }

  const updateRes = await makeAuthorizedOkoApiRequest<ReshareRequestV2, void>(
    "user/reshare",
    idToken,
    {
      secp256k1_public_key: secp256k1.publicKey,
      ed25519_public_key: ed25519.publicKey,
      reshared_key_shares: nodesNeedingReshare.map((n) => ({
        name: n.name,
        endpoint: n.endpoint,
      })),
    },
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
