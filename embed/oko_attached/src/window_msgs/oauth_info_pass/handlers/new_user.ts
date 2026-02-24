import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import { teddsaKeyShareToHex } from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";
import { type OAuthSignInError } from "@oko-wallet/oko-sdk-core";
import { runKeygen } from "@oko-wallet/cait-sith-keplr-hooks";
import {
  serializeKeyPackage,
  serializePublicKeyPackage,
} from "@oko-wallet/teddsa-hooks";
import { reqKeygenV2 } from "@oko-wallet/api-lib";

import { splitUserKeyShares } from "@oko-wallet-attached/crypto/keygen";
import {
  TSS_V2_ENDPOINT,
  saveReferralV2,
} from "@oko-wallet-attached/requests/oko_api";
import type { UserSignInResultV2 } from "@oko-wallet-attached/window_msgs/types";
import { registerKeySharesV2 } from "@oko-wallet-attached/requests/ks_node_v2";
import {
  commitAll,
  createOkoApiCommitRevealParams,
  createKsnCommitRevealParams,
  type KsnCommitTarget,
} from "@oko-wallet-attached/crypto/commit_reveal";
import { encodePoint256ToKeyShareString } from "@oko-wallet-attached/crypto/key_share_utils";
import type { ReferralInfo } from "@oko-wallet-attached/store/memory/types";
import {
  teddsaKeygenToHex,
  runEd25519KeygenAndSplit,
  seedShareToHex,
} from "@oko-wallet-attached/crypto/keygen_ed25519";

/**
 * Handle new user who needs both secp256k1 and ed25519 keygen.
 */
export async function handleNewUserV2(
  idToken: string,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
  apiKey?: string,
  referralInfo?: ReferralInfo | null,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  // 1. secp256k1 keygen
  const secp256k1KeygenRes = await runKeygen();
  if (secp256k1KeygenRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: secp256k1KeygenRes.err },
    };
  }
  const { keygen_1: secp256k1Keygen1, keygen_2: secp256k1Keygen2 } =
    secp256k1KeygenRes.data;

  // 2. secp256k1 key share split
  const splitUserKeySharesRes = await splitUserKeyShares(
    secp256k1Keygen1,
    keyshareNodeMeta,
  );
  if (splitUserKeySharesRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: splitUserKeySharesRes.err },
    };
  }
  const secp256k1UserKeyShares = splitUserKeySharesRes.data;

  // 3. ed25519 keygen and split
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

  // 4. Commit to oko_api and ks nodes
  // For sign_up, all nodes must succeed since we register to all of them
  const { nodes } = keyshareNodeMeta;
  const ksnCommitTargets: KsnCommitTarget[] = nodes.map((node) => ({
    nodeUrl: node.endpoint,
    operationType: "sign_up",
  }));
  const commitRes = await commitAll(
    "sign_up",
    authType,
    idToken,
    ksnCommitTargets,
    nodes.length, // All nodes must commit for sign_up
  );
  if (!commitRes.success) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: commitRes.err },
    };
  }
  const { session } = commitRes.data;

  // 5. Send key shares by both curves to ks nodes using registerKeySharesV2
  const registerKeySharesResults: Result<void, string>[] = await Promise.all(
    secp256k1UserKeyShares.map(async (keyShareByNode, index) => {
      const commitRevealRes = createKsnCommitRevealParams(
        session,
        keyShareByNode.node.endpoint,
        "register",
      );
      if (!commitRevealRes.success) {
        return { success: false, err: commitRevealRes.err };
      }
      const ksnSeedShare = ed25519KsnSeedShares.find(
        (s) => s.node.endpoint === keyShareByNode.node.endpoint,
      );
      if (!ksnSeedShare) {
        return {
          success: false,
          err: `ed25519 seed share not found for node ${keyShareByNode.node.name}`,
        };
      }
      return registerKeySharesV2(
        keyShareByNode.node.endpoint,
        idToken,
        authType,
        {
          secp256k1: {
            public_key: secp256k1Keygen1.public_key.toHex(),
            share: encodePoint256ToKeyShareString(keyShareByNode.share),
          },
          ed25519: {
            public_key: ed25519Keygen1.public_key.toHex(),
            share: teddsaKeyShareToHex(ed25519UserKeyShares[index].share),
            seed_share: seedShareToHex(ksnSeedShare.share),
          },
        },
        commitRevealRes.data,
      );
    }),
  );
  const registerErrResults = registerKeySharesResults.filter(
    (result) => result.success === false,
  );
  if (registerErrResults.length > 0) {
    return {
      success: false,
      err: {
        type: "sign_in_request_fail",
        error: registerErrResults.map((result) => result.err).join("\n"),
      },
    };
  }

  // 6. Call Oko API keygenV2
  const keygenCommitRevealRes = createOkoApiCommitRevealParams(
    session,
    "keygen",
  );
  if (!keygenCommitRevealRes.success) {
    return {
      success: false,
      err: {
        type: "sign_in_request_fail",
        error: keygenCommitRevealRes.err,
      },
    };
  }

  const reqKeygenV2Res = await reqKeygenV2(
    TSS_V2_ENDPOINT,
    {
      auth_type: authType,
      keygen_2_secp256k1: {
        public_key: secp256k1Keygen1.public_key.toHex(),
        private_share: secp256k1Keygen2.tss_private_share.toHex(),
      },
      keygen_2_ed25519: {
        key_package: serializeKeyPackage(ed25519Keygen2.key_package),
        public_key_package: serializePublicKeyPackage(
          ed25519Keygen2.public_key_package,
        ),
        identifier: [...ed25519Keygen2.identifier],
        public_key: [...ed25519Keygen2.public_key.toUint8Array()],
      },
      ed25519_seed_share: seedShareToHex(ed25519ServerSeedShare),
    },
    idToken,
    keygenCommitRevealRes.data,
    apiKey,
  );
  if (reqKeygenV2Res.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: reqKeygenV2Res.msg },
    };
  }

  // Save referral info after successful keygen
  if (referralInfo?.origin) {
    try {
      await saveReferralV2(reqKeygenV2Res.data.token, {
        origin: referralInfo.origin,
        utm_source: referralInfo.utmSource,
        utm_campaign: referralInfo.utmCampaign,
      });
    } catch (err) {
      // Log but don't fail keygen if referral save fails
      console.warn("[attached] Failed to save referral:", err);
    }
  }

  // 4. Convert ed25519 keygen1 to hex format for storage
  const keyPackageEd25519Hex = teddsaKeygenToHex(ed25519Keygen1);

  return {
    success: true,
    data: {
      publicKeySecp256k1: reqKeygenV2Res.data.user.public_key_secp256k1,
      publicKeyEd25519: reqKeygenV2Res.data.user.public_key_ed25519,
      walletIdSecp256k1: reqKeygenV2Res.data.user.wallet_id_secp256k1,
      walletIdEd25519: reqKeygenV2Res.data.user.wallet_id_ed25519,
      jwtToken: reqKeygenV2Res.data.token,
      keyshare1Secp256k1: secp256k1Keygen1.tss_private_share.toHex(),
      keyPackageEd25519: keyPackageEd25519Hex.keyPackage,
      publicKeyPackageEd25519: keyPackageEd25519Hex.publicKeyPackage,
      seedEd25519: userSeedEd25519,
      isNewUser: true,
      email: reqKeygenV2Res.data.user.email ?? null,
      name: reqKeygenV2Res.data.user.name ?? null,
    },
  };
}
