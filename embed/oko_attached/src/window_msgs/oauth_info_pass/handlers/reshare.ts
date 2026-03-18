import { Bytes } from "@oko-wallet/bytes";
import type { OAuthSignInError } from "@oko-wallet/oko-sdk-core";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";

import {
  commitAll,
  createOkoApiCommitRevealParams,
  type KsnCommitTarget,
} from "@oko-wallet-attached/crypto/commit_reveal";
import { reshareUserKeySharesV2 } from "@oko-wallet-attached/crypto/reshare_v2";
import { signInV2 } from "@oko-wallet-attached/requests/oko_api";
import type { UserSignInResultV2 } from "@oko-wallet-attached/window_msgs/types";

/**
 * Handle reshare for existing user with both secp256k1 and ed25519 wallets.
 * Called when checkEmailV2 indicates needs_reshare.
 */
export async function handleReshareV2(
  idToken: string,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
  apiKey?: string,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  const { nodes } = keyshareNodeMeta;
  const registrationThreshold =
    keyshareNodeMeta.registration_threshold ?? nodes.length;

  // 1. Prepare commit targets (all nodes) with "reshare" operation type
  // Use registration_threshold to allow partial success when some nodes are down
  const ksnCommitTargets: KsnCommitTarget[] = nodes.map((node) => ({
    nodeUrl: node.endpoint,
    operationType: "reshare" as const,
  }));
  const commitRes = await commitAll(
    "reshare",
    authType,
    idToken,
    ksnCommitTargets,
    registrationThreshold,
  );
  if (!commitRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: commitRes.err },
    };
  }
  const { session } = commitRes.data;

  // 3. Sign in to Oko API
  const signInCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "signin",
  );
  if (!signInCommitRevealRes.success) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: signInCommitRevealRes.err,
      },
    };
  }
  const signInResult = await signInV2(
    idToken,
    authType,
    signInCommitRevealRes.data,
    apiKey,
  );
  if (!signInResult.success) {
    return { success: false, err: signInResult.err };
  }
  const signInResp = signInResult.data;

  // Parse public keys
  const publicKeySecp256k1Res = Bytes.fromHexString(
    signInResp.user.public_key_secp256k1,
    33,
  );
  if (!publicKeySecp256k1Res.success) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: `secp256k1 public key parse err: ${publicKeySecp256k1Res.err}`,
      },
    };
  }

  const publicKeyEd25519Res = Bytes.fromHexString(
    signInResp.user.public_key_ed25519,
    32,
  );
  if (!publicKeyEd25519Res.success) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: `ed25519 public key parse err: ${publicKeyEd25519Res.err}`,
      },
    };
  }

  const serverVerifyingShareRes = Bytes.fromHexString(
    signInResp.user.server_verifying_share_ed25519,
    32,
  );
  if (!serverVerifyingShareRes.success) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: `server verifying share parse err: ${serverVerifyingShareRes.err}`,
      },
    };
  }

  // 4. Call reshareUserKeySharesV2 with commit-reveal session
  // Pass committed node endpoints so reshare only targets reachable nodes
  const committedNodeEndpoints = commitRes.data.readyNodes.map(
    (n) => n.nodeUrl,
  );
  const reshareRes = await reshareUserKeySharesV2(
    idToken,
    authType,
    keyshareNodeMeta,
    { publicKey: publicKeySecp256k1Res.data },
    {
      publicKey: publicKeyEd25519Res.data,
      serverVerifyingShare: serverVerifyingShareRes.data,
    },
    session,
    committedNodeEndpoints,
  );
  if (!reshareRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: reshareRes.err },
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
      keyshare1Secp256k1: reshareRes.data.keyshare1Secp256k1,
      keyPackageEd25519: reshareRes.data.keyPackageEd25519,
      publicKeyPackageEd25519: reshareRes.data.publicKeyPackageEd25519,
      seedEd25519: reshareRes.data.seedEd25519,
      isNewUser: false,
      email: signInResp.user.email ?? null,
      name: signInResp.user.name ?? null,
    },
  };
}
