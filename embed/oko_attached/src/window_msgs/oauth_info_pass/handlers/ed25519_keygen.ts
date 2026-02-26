import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import { teddsaKeyShareToHex } from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";
import { type OAuthSignInError } from "@oko-wallet/oko-sdk-core";
import {
  serializeKeyPackage,
  serializePublicKeyPackage,
} from "@oko-wallet/teddsa-hooks";
import { reqKeygenEd25519 } from "@oko-wallet/teddsa-api-lib";

import {
  makeAuthorizedOkoApiRequest,
  signInV2,
  TSS_V2_ENDPOINT,
  reportKeyShareNotFound,
} from "@oko-wallet-attached/requests/oko_api";
import { combineUserShares } from "@oko-wallet-attached/crypto/combine";
import type { UserSignInResultV2 } from "@oko-wallet-attached/window_msgs/types";
import { runExpandShares } from "@oko-wallet-attached/crypto/reshare";
import {
  requestKeySharesWithBackup,
  requestKeyShares,
  registerKeyShareEd25519V2,
  reshareKeySharesV2,
} from "@oko-wallet-attached/requests/ks_node_v2";
import {
  commitAll,
  createOkoApiCommitRevealParams,
  createKsnCommitRevealParams,
  type KsnCommitTarget,
} from "@oko-wallet-attached/crypto/commit_reveal";
import type { ReshareRequestV2 } from "@oko-wallet/oko-types/user";
import {
  decodeSecp256k1SharesByNode,
  encodePoint256ToKeyShareString,
} from "@oko-wallet-attached/crypto/key_share_utils";
import {
  teddsaKeygenToHex,
  runEd25519KeygenAndSplit,
  seedShareToHex,
} from "@oko-wallet-attached/crypto/keygen_ed25519";

/**
 * Handle existing user who has secp256k1 wallet but needs ed25519 keygen.
 * Called when checkEmailV2 returns CheckEmailResponseV2NeedsEd25519Keygen.
 *
 * Flow: ed25519 keygen first -> get secp256k1 public_key from response -> combine secp256k1 shares
 */
export async function handleExistingUserNeedsEd25519Keygen(
  idToken: string,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  const { threshold, nodes } = keyshareNodeMeta;

  // 1. ed25519 keygen and split
  const ed25519KeygenSplitRes =
    await runEd25519KeygenAndSplit(keyshareNodeMeta);
  if (ed25519KeygenSplitRes.success === false) {
    return { success: false, err: ed25519KeygenSplitRes.err };
  }
  const {
    keygen1: ed25519Keygen1,
    keygen2: ed25519Keygen2,
    userKeyShares: ed25519UserKeyShares,
    serverSeedShare: ed25519ServerSeedShare,
    ksnSeedShares: ed25519KsnSeedShares,
    userSeedEd25519,
  } = ed25519KeygenSplitRes.data;

  // 2. Commit to oko_api and ks nodes
  // For add_ed25519, register/ed25519 is sent only to ACTIVE nodes
  const activeNodes = nodes.filter((n) => n.wallet_status === "ACTIVE");
  const ksnCommitTargets: KsnCommitTarget[] = activeNodes.map((node) => ({
    nodeUrl: node.endpoint,
    operationType: "add_ed25519",
  }));
  const commitRes = await commitAll(
    "add_ed25519",
    authType,
    idToken,
    ksnCommitTargets,
    activeNodes.length, // Only ACTIVE nodes are targets
  );
  if (!commitRes.success) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: commitRes.err },
    };
  }
  const { session, readyNodes, pendingCommits } = commitRes.data;

  // 3. Send ed25519 key shares to ks nodes using registerKeyShareEd25519V2
  const registerEd25519Results: Result<void, string>[] = await Promise.all(
    activeNodes.map(async (node) => {
      const commitRevealRes = createKsnCommitRevealParams(
        session,
        node.endpoint,
        "register_ed25519",
      );
      if (!commitRevealRes.success) {
        return { success: false, err: commitRevealRes.err };
      }
      const shareForNode = ed25519UserKeyShares.find(
        (s) => s.node.endpoint === node.endpoint,
      );
      if (!shareForNode) {
        return {
          success: false,
          err: `ed25519 share not found for node ${node.name}`,
        };
      }
      const ksnSeedShare = ed25519KsnSeedShares.find(
        (s) => s.node.endpoint === node.endpoint,
      );
      if (!ksnSeedShare) {
        return {
          success: false,
          err: `ed25519 seed share not found for node ${node.name}`,
        };
      }
      return registerKeyShareEd25519V2(
        node.endpoint,
        idToken,
        authType,
        ed25519Keygen1.public_key.toHex(),
        teddsaKeyShareToHex(shareForNode.share),
        commitRevealRes.data,
        seedShareToHex(ksnSeedShare.share),
      );
    }),
  );
  const registerEd25519ErrResults = registerEd25519Results.filter(
    (result) => result.success === false,
  );
  if (registerEd25519ErrResults.length > 0) {
    return {
      success: false,
      err: {
        type: "sign_in_request_fail",
        error: registerEd25519ErrResults.map((result) => result.err).join("\n"),
      },
    };
  }

  // 4. Call keygenEd25519 Oko API
  const keygenEd25519CommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "keygen_ed25519",
  );
  if (!keygenEd25519CommitRevealRes.success) {
    return {
      success: false,
      err: {
        type: "sign_in_request_fail",
        error: keygenEd25519CommitRevealRes.err,
      },
    };
  }
  const reqKeygenEd25519Res = await reqKeygenEd25519(
    TSS_V2_ENDPOINT,
    {
      auth_type: authType,
      keygen_2: {
        key_package: serializeKeyPackage(ed25519Keygen2.key_package),
        public_key_package: serializePublicKeyPackage(
          ed25519Keygen2.public_key_package,
        ),
        identifier: [...ed25519Keygen2.identifier],
        public_key: [...ed25519Keygen2.public_key.toUint8Array()],
      },
      seed_share: seedShareToHex(ed25519ServerSeedShare),
    },
    idToken,
    keygenEd25519CommitRevealRes.data,
  );
  if (reqKeygenEd25519Res.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: reqKeygenEd25519Res.msg },
    };
  }

  // 5. Get secp256k1 public key from keygenEd25519 response
  const secp256k1PublicKey = reqKeygenEd25519Res.data.user.public_key_secp256k1;

  // 6. Request both shares from ks nodes (ed25519 was just registered in step 3)
  // Uses readyNodes first, falls back to pendingCommits if needed
  const requestSharesRes = await requestKeySharesWithBackup({
    idToken,
    authType,
    wallets: {
      secp256k1: secp256k1PublicKey,
      ed25519: ed25519Keygen1.public_key.toHex(),
    },
    threshold,
    session,
    readyNodes,
    pendingCommits,
    allNodes: nodes,
  });
  if (!requestSharesRes.success) {
    const error = requestSharesRes.err;
    console.error(
      `[attached] insufficient shares: got ${error.got}/${error.need}`,
    );
    return {
      success: false,
      err: {
        type: "insufficient_shares",
      },
    };
  }

  const { shares: keySharesByNode, notFoundNodes } = requestSharesRes.data;

  // 7. Decode secp256k1 shares
  const secp256k1DecodeRes = await decodeSecp256k1SharesByNode(keySharesByNode);
  if (!secp256k1DecodeRes.success) {
    return { success: false, err: secp256k1DecodeRes.err };
  }

  // 8. Combine secp256k1 shares
  const keyshare1Secp256k1Res = await combineUserShares(
    secp256k1DecodeRes.data,
    threshold,
  );
  if (keyshare1Secp256k1Res.success === false) {
    return {
      success: false,
      err: {
        type: "key_share_combine_fail",
        error: `secp256k1 combine err: ${keyshare1Secp256k1Res.err}`,
      },
    };
  }
  const keyshare1Secp256k1 = keyshare1Secp256k1Res.data;

  // 9. Report nodes that returned KEY_SHARE_NOT_FOUND
  if (notFoundNodes.length > 0) {
    console.log(
      "[attached] reporting %d nodes with KEY_SHARE_NOT_FOUND",
      notFoundNodes.length,
    );
    reportKeyShareNotFound(reqKeygenEd25519Res.data.token, notFoundNodes);
  }

  // 10. Convert ed25519 keygen1 to hex format for storage
  const keyPackageEd25519Hex = teddsaKeygenToHex(ed25519Keygen1);

  return {
    success: true,
    data: {
      publicKeySecp256k1: reqKeygenEd25519Res.data.user.public_key_secp256k1,
      publicKeyEd25519: reqKeygenEd25519Res.data.user.public_key_ed25519,
      walletIdSecp256k1: reqKeygenEd25519Res.data.user.wallet_id_secp256k1,
      walletIdEd25519: reqKeygenEd25519Res.data.user.wallet_id_ed25519,
      jwtToken: reqKeygenEd25519Res.data.token,
      keyshare1Secp256k1,
      keyPackageEd25519: keyPackageEd25519Hex.keyPackage,
      publicKeyPackageEd25519: keyPackageEd25519Hex.publicKeyPackage,
      seedEd25519: userSeedEd25519,
      isNewUser: false,
      email: reqKeygenEd25519Res.data.user.email ?? null,
      name: reqKeygenEd25519Res.data.user.name ?? null,
    },
  };
}

/**
 * Handle reshare for secp256k1 + keygen for ed25519 (scenario 6).
 * Called when user has secp256k1 wallet, needs reshare, and needs ed25519 keygen.
 *
 * Commit-reveal:
 * - oko_api: keygen_ed25519 + sign_in + reshare
 * - KSN: register_ed25519 + reshare (upsert)
 */
export async function handleReshareAndEd25519Keygen(
  idToken: string,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  const { threshold, nodes } = keyshareNodeMeta;

  // 1. Classify nodes
  const activeNodes = nodes.filter((n) => n.wallet_status === "ACTIVE");

  if (activeNodes.length < threshold) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: "insufficient existing KS nodes for reshare",
      },
    };
  }

  // 2. ed25519 keygen and split
  const ed25519KeygenSplitRes =
    await runEd25519KeygenAndSplit(keyshareNodeMeta);
  if (ed25519KeygenSplitRes.success === false) {
    return { success: false, err: ed25519KeygenSplitRes.err };
  }
  const {
    keygen1: ed25519Keygen1,
    keygen2: ed25519Keygen2,
    userKeyShares: ed25519UserKeyShares,
    serverSeedShare: ed25519ServerSeedShare,
    ksnSeedShares: ed25519KsnSeedShares,
    userSeedEd25519,
  } = ed25519KeygenSplitRes.data;

  // 3. Commit to oko_api and ks nodes with "add_ed25519_with_reshare" operation type
  // For add_ed25519_with_reshare, all nodes must commit since we reshare to all of them
  const ksnCommitTargets: KsnCommitTarget[] = nodes.map((node) => ({
    nodeUrl: node.endpoint,
    operationType: "add_ed25519_with_reshare" as const,
  }));
  const commitRes = await commitAll(
    "add_ed25519_with_reshare",
    authType,
    idToken,
    ksnCommitTargets,
    nodes.length, // All nodes must commit for reshare
  );
  if (!commitRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: commitRes.err },
    };
  }
  const { session } = commitRes.data;

  // 4. Register ed25519 to ACTIVE nodes first
  // Must happen before keygen_ed25519 API which verifies ed25519 on user's ACTIVE secp256k1 nodes
  const registerEd25519Results: Result<void, string>[] = await Promise.all(
    activeNodes.map(async (node) => {
      const nodeShare = ed25519UserKeyShares.find(
        (s) => s.node.endpoint === node.endpoint,
      );
      if (!nodeShare) {
        return {
          success: false,
          err: `ed25519 share not found for ${node.name}`,
        };
      }
      const commitRevealRes = createKsnCommitRevealParams(
        session,
        node.endpoint,
        "register_ed25519",
      );
      if (!commitRevealRes.success) {
        return { success: false, err: commitRevealRes.err };
      }
      const ksnSeedShare = ed25519KsnSeedShares.find(
        (s) => s.node.endpoint === node.endpoint,
      );
      if (!ksnSeedShare) {
        return {
          success: false,
          err: `ed25519 seed share not found for node ${node.name}`,
        };
      }
      return registerKeyShareEd25519V2(
        node.endpoint,
        idToken,
        authType,
        ed25519Keygen1.public_key.toHex(),
        teddsaKeyShareToHex(nodeShare.share),
        commitRevealRes.data,
        seedShareToHex(ksnSeedShare.share),
      );
    }),
  );
  const registerEd25519ErrResults = registerEd25519Results.filter(
    (r) => !r.success,
  );
  if (registerEd25519ErrResults.length > 0) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: registerEd25519ErrResults.map((r) => r.err).join("\n"),
      },
    };
  }

  // 5. Call keygenEd25519 API (creates ed25519 wallet on server)
  // Must happen before signInV2 because signInV2 requires both wallets to exist
  const keygenEd25519CommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "keygen_ed25519",
  );
  if (!keygenEd25519CommitRevealRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: keygenEd25519CommitRevealRes.err },
    };
  }
  const reqKeygenEd25519Res = await reqKeygenEd25519(
    TSS_V2_ENDPOINT,
    {
      auth_type: authType,
      keygen_2: {
        key_package: serializeKeyPackage(ed25519Keygen2.key_package),
        public_key_package: serializePublicKeyPackage(
          ed25519Keygen2.public_key_package,
        ),
        identifier: [...ed25519Keygen2.identifier],
        public_key: [...ed25519Keygen2.public_key.toUint8Array()],
      },
      seed_share: seedShareToHex(ed25519ServerSeedShare),
    },
    idToken,
    keygenEd25519CommitRevealRes.data,
  );
  if (reqKeygenEd25519Res.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: reqKeygenEd25519Res.msg },
    };
  }

  // 6. Sign in (now works because ed25519 wallet was created in step 5)
  const signInCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "signin",
  );
  if (!signInCommitRevealRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: signInCommitRevealRes.err },
    };
  }
  const signInResult = await signInV2(
    idToken,
    authType,
    signInCommitRevealRes.data,
  );
  if (!signInResult.success) {
    return { success: false, err: signInResult.err };
  }
  const signInResp = signInResult.data;
  const secp256k1PublicKey = signInResp.user.public_key_secp256k1;

  // 6. Request both shares from ACTIVE nodes (no backup logic needed for reshare)
  const requestSharesRes = await requestKeyShares({
    idToken,
    authType,
    wallets: {
      secp256k1: secp256k1PublicKey,
      ed25519: ed25519Keygen1.public_key.toHex(),
    },
    threshold,
    session,
    nodes: activeNodes,
  });
  if (!requestSharesRes.success) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: `Failed to request shares: ${requestSharesRes.err.code}`,
      },
    };
  }

  // 7. Decode secp256k1 shares
  const secp256k1DecodeRes = await decodeSecp256k1SharesByNode(
    requestSharesRes.data,
  );
  if (!secp256k1DecodeRes.success) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: secp256k1DecodeRes.err.error,
      },
    };
  }

  // 8. Expand secp256k1 shares to additional nodes
  const additionalNodes = nodes.filter(
    (n) =>
      n.wallet_status === "NOT_REGISTERED" ||
      n.wallet_status === "UNRECOVERABLE_DATA_LOSS",
  );
  const secp256k1ExpandRes = await runExpandShares(
    secp256k1DecodeRes.data,
    additionalNodes,
    threshold,
  );
  if (!secp256k1ExpandRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: secp256k1ExpandRes.err },
    };
  }

  // 8. Send shares to KSN (unified reshare API handles upsert for both wallets)
  const sendResults = await Promise.all(
    secp256k1ExpandRes.data.reshared_user_key_shares.map(
      async (secp256k1Share) => {
        const ed25519Share = ed25519UserKeyShares.find(
          (s) => s.node.endpoint === secp256k1Share.node.endpoint,
        );
        if (!ed25519Share) {
          return { success: false, err: "ed25519 share not found for node" };
        }

        const node = secp256k1Share.node;

        // Use unified reshare API for all nodes (upsert handles ACTIVE vs new)
        const commitRevealRes = createKsnCommitRevealParams(
          session,
          node.endpoint,
          "reshare",
        );
        if (!commitRevealRes.success) {
          return { success: false, err: commitRevealRes.err };
        }

        const ksnSeedShare = ed25519KsnSeedShares.find(
          (s) => s.node.endpoint === node.endpoint,
        );
        if (!ksnSeedShare) {
          return {
            success: false,
            err: `ed25519 seed share not found for node ${node.name}`,
          };
        }
        // First: reshare with both wallets (secp256k1 verified/registered, ed25519 registered)
        const reshareRes = await reshareKeySharesV2(
          node.endpoint,
          idToken,
          authType,
          {
            secp256k1: {
              public_key: secp256k1PublicKey,
              share: encodePoint256ToKeyShareString(secp256k1Share.share),
            },
            ed25519: {
              public_key: ed25519Keygen1.public_key.toHex(),
              share: teddsaKeyShareToHex(ed25519Share.share),
              seed_share: seedShareToHex(ksnSeedShare.share),
            },
          },
          commitRevealRes.data,
        );
        return reshareRes;
      },
    ),
  );

  const errResults = sendResults.filter((r) => !r.success);
  if (errResults.length > 0) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: errResults.map((r) => (r as { err: string }).err).join("\n"),
      },
    };
  }

  // 10. Update Oko API reshare status (FINAL - both wallets now exist)
  const reshareCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "reshare",
  );
  if (!reshareCommitRevealRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: reshareCommitRevealRes.err },
    };
  }
  const resharedNodes = secp256k1ExpandRes.data.reshared_user_key_shares.map(
    (s) => s.node,
  );
  const updateRes = await makeAuthorizedOkoApiRequest<ReshareRequestV2, void>(
    "user/reshare",
    idToken,
    {
      auth_type: authType,
      secp256k1_public_key: secp256k1PublicKey,
      ed25519_public_key: reqKeygenEd25519Res.data.user.public_key_ed25519,
      reshared_key_shares: resharedNodes,
    },
    TSS_V2_ENDPOINT,
    reshareCommitRevealRes.data,
  );
  if (!updateRes.success) {
    console.warn("[attached] Failed to update reshare status:", updateRes.err);
  }

  // 11. Convert ed25519 keygen1 to hex format for storage
  const keyPackageEd25519Hex = teddsaKeygenToHex(ed25519Keygen1);

  return {
    success: true,
    data: {
      publicKeySecp256k1: reqKeygenEd25519Res.data.user.public_key_secp256k1,
      publicKeyEd25519: reqKeygenEd25519Res.data.user.public_key_ed25519,
      walletIdSecp256k1: reqKeygenEd25519Res.data.user.wallet_id_secp256k1,
      walletIdEd25519: reqKeygenEd25519Res.data.user.wallet_id_ed25519,
      jwtToken: reqKeygenEd25519Res.data.token,
      keyshare1Secp256k1: secp256k1ExpandRes.data.original_secret.toHex(),
      keyPackageEd25519: keyPackageEd25519Hex.keyPackage,
      publicKeyPackageEd25519: keyPackageEd25519Hex.publicKeyPackage,
      seedEd25519: userSeedEd25519,
      isNewUser: false,
      email: reqKeygenEd25519Res.data.user.email ?? null,
      name: reqKeygenEd25519Res.data.user.name ?? null,
    },
  };
}
