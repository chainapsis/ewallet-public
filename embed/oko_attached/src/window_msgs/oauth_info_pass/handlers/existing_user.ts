import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import {
  hexToTeddsaKeyShare,
  type TeddsaKeyShareByNode,
} from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";
import { type OAuthSignInError } from "@oko-wallet/oko-sdk-core";
import { Bytes, type Bytes32 } from "@oko-wallet/bytes";

import { signInV2 } from "@oko-wallet-attached/requests/oko_api";
import { combineUserShares } from "@oko-wallet-attached/crypto/combine";
import type { UserSignInResultV2 } from "@oko-wallet-attached/window_msgs/types";
import {
  expandAndSendReshareV2,
  buildKeyPackageResult,
} from "@oko-wallet-attached/crypto/reshare_v2";
import { requestKeySharesV2WithReshareInfo } from "@oko-wallet-attached/requests/ks_node_v2";
import {
  commitAll,
  createOkoApiCommitRevealParams,
  type KsnCommitTarget,
} from "@oko-wallet-attached/crypto/commit_reveal";
import { decodeSecp256k1SharesByNode } from "@oko-wallet-attached/crypto/key_share_utils";
import { combineTeddsaShares } from "@oko-wallet-attached/crypto/sss_ed25519";

/**
 * Handle existing user who has both secp256k1 and ed25519 wallets.
 * Called when checkEmailV2 returns CheckEmailResponseV2ExistingUser with both wallets.
 *
 * Supports auto-reshare: if some nodes return WALLET_NOT_FOUND but we have
 * threshold shares from other nodes, automatically reshare to recover.
 */
export async function handleExistingUserV2(
  idToken: string,
  keyshareNodeMetaSecp256k1: KeyShareNodeMetaWithNodeStatusInfo,
  keyshareNodeMetaEd25519: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  // 1. Commit to oko_api and ks nodes
  const ksnCommitTargets: KsnCommitTarget[] =
    keyshareNodeMetaSecp256k1.nodes.map((node) => ({
      nodeUrl: node.endpoint,
      operationType: "sign_in" as const,
    }));
  const commitRes = await commitAll(
    "sign_in",
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

  // 2. Sign in to API server
  // Use cr_final=false because reshare might be needed
  const signInCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "signin",
    false, // cr_final: false - reshare might come after
  );
  if (!signInCommitRevealRes.success) {
    return {
      success: false,
      err: {
        type: "sign_in_request_fail",
        error: signInCommitRevealRes.err,
      },
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

  // 3. Request secp256k1 and ed25519 shares from ks nodes
  // Use continueOnWalletNotFound=true to support auto-reshare
  const requestSharesRes = await requestKeySharesV2WithReshareInfo(
    idToken,
    keyshareNodeMetaSecp256k1.nodes,
    keyshareNodeMetaSecp256k1.threshold,
    authType,
    {
      secp256k1: signInResp.user.public_key_secp256k1,
      ed25519: signInResp.user.public_key_ed25519,
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

  const { shares: keySharesByNode, nodesNeedingReshare } =
    requestSharesRes.data;
  const needsReshare = nodesNeedingReshare.length > 0;

  if (needsReshare) {
    console.log(
      "[attached] auto-reshare: detected %d nodes needing reshare",
      nodesNeedingReshare.length,
    );
  }

  // 4. Decode and combine secp256k1 shares
  const secp256k1DecodeRes = await decodeSecp256k1SharesByNode(keySharesByNode);
  if (!secp256k1DecodeRes.success) {
    return { success: false, err: secp256k1DecodeRes.err };
  }

  // 5. Combine ed25519 shares
  const ed25519SharesByNode: TeddsaKeyShareByNode[] = [];
  for (const item of keySharesByNode) {
    const shareHex = item.shares.ed25519;
    if (!shareHex) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `ed25519 share missing from node: ${item.node.name}`,
        },
      };
    }
    try {
      const teddsaShare = hexToTeddsaKeyShare(shareHex);
      ed25519SharesByNode.push({
        node: item.node,
        share: teddsaShare,
      });
    } catch (e) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `ed25519 decode err: ${String(e)}`,
        },
      };
    }
  }

  // Get verifying_key from public key
  const verifyingKeyRes = Bytes.fromHexString(
    signInResp.user.public_key_ed25519,
    32,
  );
  if (!verifyingKeyRes.success) {
    return {
      success: false,
      err: {
        type: "key_share_combine_fail",
        error: `verifying_key parse err: ${verifyingKeyRes.err}`,
      },
    };
  }
  const verifyingKey = verifyingKeyRes.data;

  // Parse server's verifying_share from sign-in response
  const serverVerifyingShareRes = Bytes.fromHexString(
    signInResp.user.server_verifying_share_ed25519,
    32,
  );
  if (!serverVerifyingShareRes.success) {
    return {
      success: false,
      err: {
        type: "key_share_combine_fail",
        error: `server verifying_share parse err: ${serverVerifyingShareRes.err}`,
      },
    };
  }

  // 6. Auto-reshare if needed, or just combine shares
  let keyshare1Secp256k1: string;
  let signingShare: Bytes32;

  if (needsReshare) {
    console.log(
      "[attached] auto-reshare: expanding and sending to %d nodes",
      nodesNeedingReshare.length,
    );

    const reshareRes = await expandAndSendReshareV2({
      idToken,
      authType,
      session,
      nodesNeedingReshare,
      secp256k1: {
        shares: secp256k1DecodeRes.data,
        threshold: keyshareNodeMetaSecp256k1.threshold,
        publicKey: signInResp.user.public_key_secp256k1,
      },
      ed25519: {
        shares: ed25519SharesByNode,
        threshold: keyshareNodeMetaEd25519.threshold,
        verifyingKey,
        publicKey: signInResp.user.public_key_ed25519,
      },
    });
    if (!reshareRes.success) {
      return {
        success: false,
        err: { type: "reshare_fail", error: reshareRes.err },
      };
    }
    // Both are guaranteed to exist when secp256k1 and ed25519 are provided
    keyshare1Secp256k1 = reshareRes.data.keyshare1Secp256k1!;
    signingShare = reshareRes.data.signingShare!;

    console.log("[attached] auto-reshare completed successfully");
  } else {
    // No reshare needed - just combine shares
    const keyshare1Secp256k1Res = await combineUserShares(
      secp256k1DecodeRes.data,
      keyshareNodeMetaSecp256k1.threshold,
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

    const signingShareRes = await combineTeddsaShares(
      ed25519SharesByNode,
      keyshareNodeMetaEd25519.threshold,
      verifyingKey,
    );
    if (!signingShareRes.success) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `ed25519 combine err: ${signingShareRes.err}`,
        },
      };
    }
    signingShare = signingShareRes.data;
  }

  // 7. Build KeyPackage and PublicKeyPackage
  const keyPackageRes = buildKeyPackageResult({
    signingShare,
    verifyingKey,
    serverVerifyingShare: serverVerifyingShareRes.data,
    threshold: keyshareNodeMetaEd25519.threshold,
  });
  if (!keyPackageRes.success) {
    return {
      success: false,
      err: {
        type: "key_share_combine_fail",
        error: keyPackageRes.err,
      },
    };
  }

  return {
    success: true,
    data: {
      publicKeySecp256k1: signInResp.user.public_key_secp256k1,
      publicKeyEd25519: signInResp.user.public_key_ed25519,
      walletIdSecp256k1: signInResp.user.wallet_id_secp256k1,
      walletIdEd25519: signInResp.user.wallet_id_ed25519,
      jwtToken: signInResp.token,
      keyshare1Secp256k1,
      keyPackageEd25519: keyPackageRes.data.keyPackageEd25519,
      publicKeyPackageEd25519: keyPackageRes.data.publicKeyPackageEd25519,
      isNewUser: false,
      email: signInResp.user.email ?? null,
      name: signInResp.user.name ?? null,
    },
  };
}
