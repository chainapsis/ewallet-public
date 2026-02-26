import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
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
import { runExpandShares, runSeedExpandShares } from "./reshare";
import {
  expandTeddsaSigningShare,
  reconstructKeyPackage,
  keyPackageToRaw,
  getClientFrostIdentifier,
  getServerFrostIdentifier,
} from "./sss_ed25519";
import { computeVerifyingShare } from "./scalar";
import { hexToSeedSharePoint, seedShareToHex } from "./keygen_ed25519";

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
 * Convert V2 API response to seed share UserKeySharePointByNode format.
 * Seed shares use the same secp256k1 SSS point structure.
 */
export function convertSeedShares(
  keySharesByNode: KeySharesByNode[],
): UserKeySharePointByNode[] {
  const result: UserKeySharePointByNode[] = [];
  for (const item of keySharesByNode) {
    const seedShareHex = item.shares.ed25519_seed_share;
    if (!seedShareHex) {
      throw new Error(
        `ed25519 seed_share missing from node: ${item.node.name}`,
      );
    }

    const shareRes = hexToSeedSharePoint(seedShareHex);
    if (!shareRes.success) {
      throw new Error(`seed share decode err: ${shareRes.err}`);
    }
    result.push({
      node: item.node,
      share: shareRes.data,
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
  seedEd25519: number[]; // combined ed25519 user seed share
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

  // 4.5. Process seed shares (257-bit prime SSS expand)
  const seedSharesByNode = convertSeedShares(sharesRes.data);
  const seedExpandRes = await runSeedExpandShares(
    seedSharesByNode,
    additionalNodes,
    threshold,
  );
  if (!seedExpandRes.success) {
    return { success: false, err: seedExpandRes.err };
  }
  const seedResult = {
    resharedShares: seedExpandRes.data.reshared_user_key_shares,
    originalSecret: [...seedExpandRes.data.original_secret.toUint8Array()],
  };

  // 5. Send new shares to ALL nodes
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
      const seedShare = seedResult.resharedShares.find(
        (s) => s.node.endpoint === node.endpoint,
      );

      if (!secp256k1Share || !ed25519Share || !seedShare) {
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
          seed_share: seedShareToHex(seedShare.share),
        },
      };

      // Create commit-reveal params for this node
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
      auth_type: authType,
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

  // 7. Build KeyPackage and PublicKeyPackage
  const keyPackageRes = buildKeyPackageResult({
    signingShare: ed25519Result.originalSigningShare,
    verifyingKey: ed25519.publicKey,
    serverVerifyingShare: ed25519.serverVerifyingShare,
    threshold,
  });
  if (!keyPackageRes.success) {
    return { success: false, err: keyPackageRes.err };
  }

  return {
    success: true,
    data: {
      keyshare1Secp256k1: secp256k1Result.originalSecret,
      keyPackageEd25519: keyPackageRes.data.keyPackageEd25519,
      publicKeyPackageEd25519: keyPackageRes.data.publicKeyPackageEd25519,
      seedEd25519: seedResult.originalSecret,
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
