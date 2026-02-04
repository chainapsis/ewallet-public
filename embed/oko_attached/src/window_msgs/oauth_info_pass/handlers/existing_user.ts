import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import {
  hexToTeddsaKeyShare,
  type TeddsaKeyShareByNode,
} from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";
import { type OAuthSignInError } from "@oko-wallet/oko-sdk-core";
import { Bytes } from "@oko-wallet/bytes";

import {
  signInV2,
  reportKeyShareNotFound,
} from "@oko-wallet-attached/requests/oko_api";
import { combineUserShares } from "@oko-wallet-attached/crypto/combine";
import type { UserSignInResultV2 } from "@oko-wallet-attached/window_msgs/types";
import { buildKeyPackageResult } from "@oko-wallet-attached/crypto/reshare_v2";
import { requestKeySharesWithBackup } from "@oko-wallet-attached/requests/ks_node_v2";
import {
  commitAll,
  createOkoApiCommitRevealParams,
  type KsnCommitTarget,
} from "@oko-wallet-attached/crypto/commit_reveal";
import { decodeSecp256k1SharesByNode } from "@oko-wallet-attached/crypto/key_share_utils";
import { combineTeddsaShares } from "@oko-wallet-attached/crypto/sss_ed25519";

/**
 * Handle existing user who has both secp256k1 and ed25519 wallets.
 * Called when checkEmailV2 returns CheckEmailResponseV2BothWallets.
 *
 * If some nodes return KEY_SHARE_NOT_FOUND, reports them to oko_api
 * so they're marked as UNRECOVERABLE_DATA_LOSS for the next login's reshare.
 */
export async function handleExistingUserV2(
  idToken: string,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  const { threshold, nodes } = keyshareNodeMeta;

  // 1. Commit to oko_api and ks nodes
  // For sign_in, we need at least threshold nodes to get shares
  const ksnCommitTargets: KsnCommitTarget[] = nodes.map((node) => ({
    nodeUrl: node.endpoint,
    operationType: "sign_in" as const,
  }));
  const commitRes = await commitAll(
    "sign_in",
    authType,
    idToken,
    ksnCommitTargets,
    threshold,
  );
  if (!commitRes.success) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: commitRes.err },
    };
  }
  const { session, readyNodes, pendingCommits } = commitRes.data;

  // 2. Sign in to API server
  const signInCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "signin",
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
  // Uses readyNodes first, falls back to pendingCommits if needed
  const requestSharesRes = await requestKeySharesWithBackup({
    idToken,
    authType,
    wallets: {
      secp256k1: signInResp.user.public_key_secp256k1,
      ed25519: signInResp.user.public_key_ed25519,
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

  // 6. Combine shares
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

  const signingShareRes = await combineTeddsaShares(
    ed25519SharesByNode,
    threshold,
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
  const signingShare = signingShareRes.data;

  // 7. Build KeyPackage and PublicKeyPackage
  const keyPackageRes = buildKeyPackageResult({
    signingShare,
    verifyingKey,
    serverVerifyingShare: serverVerifyingShareRes.data,
    threshold,
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

  // 8. Report nodes that returned KEY_SHARE_NOT_FOUND
  if (notFoundNodes.length > 0) {
    console.log(
      "[attached] reporting %d nodes with KEY_SHARE_NOT_FOUND",
      notFoundNodes.length,
    );
    reportKeyShareNotFound(signInResp.token, notFoundNodes);
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
