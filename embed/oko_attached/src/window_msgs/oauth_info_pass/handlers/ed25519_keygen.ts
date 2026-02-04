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
} from "@oko-wallet-attached/requests/oko_api";
import { combineUserShares } from "@oko-wallet-attached/crypto/combine";
import type { UserSignInResultV2 } from "@oko-wallet-attached/window_msgs/types";
import { runExpandShares } from "@oko-wallet-attached/crypto/reshare";
import { expandAndSendReshareV2 } from "@oko-wallet-attached/crypto/reshare_v2";
import {
  requestKeySharesV2,
  requestKeySharesV2WithReshareInfo,
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
  const ed25519KeygenSplitRes = await runEd25519KeygenAndSplit(keyshareNodeMeta);
  if (ed25519KeygenSplitRes.success === false) {
    return { success: false, err: ed25519KeygenSplitRes.err };
  }
  const {
    keygen1: ed25519Keygen1,
    keygen2: ed25519Keygen2,
    userKeyShares: ed25519UserKeyShares,
  } = ed25519KeygenSplitRes.data;

  // 2. Commit to oko_api and ks nodes
  const ksnCommitTargets: KsnCommitTarget[] = nodes.map((node) => ({
    nodeUrl: node.endpoint,
    operationType: "add_ed25519",
  }));
  const commitRes = await commitAll(
    "add_ed25519",
    authType,
    idToken,
    ksnCommitTargets,
  );
  if (!commitRes.success) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: commitRes.err },
    };
  }
  const session = commitRes.data;

  // 3. Send ed25519 key shares to ks nodes using registerKeyShareEd25519V2
  const registerEd25519Results: Result<void, string>[] = await Promise.all(
    nodes.map(async (node, index) => {
      const commitRevealRes = createKsnCommitRevealParams(
        session,
        node.endpoint,
        "register_ed25519",
      );
      if (!commitRevealRes.success) {
        return { success: false, err: commitRevealRes.err };
      }
      return registerKeyShareEd25519V2(
        node.endpoint,
        idToken,
        authType,
        ed25519Keygen1.public_key.toHex(),
        teddsaKeyShareToHex(ed25519UserKeyShares[index].share),
        commitRevealRes.data,
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
  // Use cr_final=false because secp256k1 reshare might be needed
  const keygenEd25519CommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "keygen_ed25519",
    false, // cr_final: false - secp256k1 reshare might come after
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
  // Use continueOnWalletNotFound=true to support auto-reshare
  const requestSharesRes = await requestKeySharesV2WithReshareInfo(
    idToken,
    nodes,
    threshold,
    authType,
    {
      secp256k1: secp256k1PublicKey,
      ed25519: ed25519Keygen1.public_key.toHex(),
    },
    session,
    false, // isFinal: false - reshare might come after
    true, // continueOnWalletNotFound: true for auto-reshare
  );
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

  const { shares: keySharesByNode, nodesNeedingReshare } = requestSharesRes.data;
  const needsReshare = nodesNeedingReshare.length > 0;

  if (needsReshare) {
    console.log(
      "[attached] auto-reshare: detected %d nodes needing secp256k1 reshare",
      nodesNeedingReshare.length,
    );
  }

  // 7. Decode secp256k1 shares
  const secp256k1DecodeRes = await decodeSecp256k1SharesByNode(keySharesByNode);
  if (!secp256k1DecodeRes.success) {
    return { success: false, err: secp256k1DecodeRes.err };
  }

  // 8. Auto-reshare secp256k1 if needed, or just combine
  let keyshare1Secp256k1: string;

  if (needsReshare) {
    console.log(
      "[attached] auto-reshare: expanding and sending secp256k1 to %d nodes",
      nodesNeedingReshare.length,
    );

    const reshareRes = await expandAndSendReshareV2({
      idToken,
      authType,
      session,
      nodesNeedingReshare,
      secp256k1: {
        shares: secp256k1DecodeRes.data,
        threshold,
        publicKey: secp256k1PublicKey,
      },
      // ed25519 is not provided - already registered via register_ed25519
    });
    if (!reshareRes.success) {
      return {
        success: false,
        err: { type: "reshare_fail", error: reshareRes.err },
      };
    }
    // keyshare1Secp256k1 is guaranteed to exist when secp256k1 is provided
    keyshare1Secp256k1 = reshareRes.data.keyshare1Secp256k1!;

    console.log("[attached] auto-reshare secp256k1 completed successfully");
  } else {
    // No reshare needed - just combine shares
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
    keyshare1Secp256k1 = keyshare1Secp256k1Res.data;
  }

  // 9. Convert ed25519 keygen1 to hex format for storage
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
 * - oko_api: sign_in + reshare + keygen_ed25519
 * - KSN: reshare (upsert) + register_ed25519
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
  const ed25519KeygenSplitRes = await runEd25519KeygenAndSplit(keyshareNodeMeta);
  if (ed25519KeygenSplitRes.success === false) {
    return { success: false, err: ed25519KeygenSplitRes.err };
  }
  const {
    keygen1: ed25519Keygen1,
    keygen2: ed25519Keygen2,
    userKeyShares: ed25519UserKeyShares,
  } = ed25519KeygenSplitRes.data;

  // 3. Commit to oko_api and ks nodes
  const ksnCommitTargets: KsnCommitTarget[] = nodes.map((node) => ({
    nodeUrl: node.endpoint,
    operationType: "add_ed25519" as const,
  }));
  const commitRes = await commitAll(
    "add_ed25519",
    authType,
    idToken,
    ksnCommitTargets,
  );
  if (!commitRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: commitRes.err },
    };
  }
  const session = commitRes.data;

  // 4. Sign in to get the public key
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

  // 5. Register ed25519 to ACTIVE nodes first (so we can request both wallets)
  const registerEd25519Results: Result<void, string>[] = await Promise.all(
    activeNodes.map(async (node) => {
      const nodeShare = ed25519UserKeyShares.find(
        (s) => s.node.endpoint === node.endpoint,
      );
      if (!nodeShare) {
        return { success: false, err: `ed25519 share not found for ${node.name}` };
      }
      const commitRevealRes = createKsnCommitRevealParams(
        session,
        node.endpoint,
        "register_ed25519",
      );
      if (!commitRevealRes.success) {
        return { success: false, err: commitRevealRes.err };
      }
      return registerKeyShareEd25519V2(
        node.endpoint,
        idToken,
        authType,
        ed25519Keygen1.public_key.toHex(),
        teddsaKeyShareToHex(nodeShare.share),
        commitRevealRes.data,
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

  // 6. Request both shares from ACTIVE nodes
  const requestSharesRes = await requestKeySharesV2(
    idToken,
    activeNodes,
    threshold,
    authType,
    {
      secp256k1: secp256k1PublicKey,
      ed25519: ed25519Keygen1.public_key.toHex(),
    },
    session,
  );
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
            },
          },
          commitRevealRes.data,
        );
        if (!reshareRes.success) {
          return reshareRes;
        }

        // Also register ed25519 separately (for proper ed25519 wallet association)
        const registerEd25519CommitRevealRes = createKsnCommitRevealParams(
          session,
          node.endpoint,
          "register_ed25519",
          true, // cr_final: true - final KSN call for this node
        );
        if (!registerEd25519CommitRevealRes.success) {
          return { success: false, err: registerEd25519CommitRevealRes.err };
        }
        return registerKeyShareEd25519V2(
          node.endpoint,
          idToken,
          authType,
          ed25519Keygen1.public_key.toHex(),
          teddsaKeyShareToHex(ed25519Share.share),
          registerEd25519CommitRevealRes.data,
        );
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

  // 9. Call keygenEd25519 API (creates ed25519 wallet on server)
  const keygenEd25519CommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "keygen_ed25519",
    false, // cr_final: false - reshare comes after
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

  // 10. Update Oko API reshare status (FINAL - both wallets now exist)
  const reshareCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "reshare",
    true, // cr_final: true - reshare is the final oko_api call
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
      isNewUser: false,
      email: reqKeygenEd25519Res.data.user.email ?? null,
      name: reqKeygenEd25519Res.data.user.name ?? null,
    },
  };
}
