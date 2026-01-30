import type {
  CheckEmailRequest,
  CheckEmailResponseV2,
  SignInResponseV2,
} from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import { type OAuthSignInError } from "@oko-wallet/oko-sdk-core";

import { splitUserKeyShares } from "@oko-wallet-attached/crypto/keygen";
import {
  makeAuthorizedOkoApiRequest,
  makeOkoApiRequest,
  TSS_V2_ENDPOINT,
  SOCIAL_LOGIN_V2_ENDPOINT,
} from "@oko-wallet-attached/requests/oko_api";
import { combineUserShares } from "@oko-wallet-attached/crypto/combine";
import type { UserSignInResultV2 } from "@oko-wallet-attached/window_msgs/types";
import type { FetchError } from "@oko-wallet-attached/requests/types";
import { runExpandShares } from "@oko-wallet-attached/crypto/reshare";
import { reshareUserKeySharesV2 } from "@oko-wallet-attached/crypto/reshare_v2";
import {
  requestKeySharesV2,
  registerKeySharesV2,
  registerKeyShareEd25519V2,
  reshareKeySharesV2,
  reshareRegisterV2,
} from "@oko-wallet-attached/requests/ks_node_v2";
import type { ReshareRequestV2 } from "@oko-wallet/oko-types/user";
import {
  decodeKeyShareStringToPoint256,
  encodePoint256ToKeyShareString,
} from "@oko-wallet-attached/crypto/key_share_utils";
import type { UserKeySharePointByNode } from "@oko-wallet/oko-types/user_key_share";
import { runKeygen } from "@oko-wallet/cait-sith-keplr-hooks";
import {
  runTeddsaKeygen,
  serializeKeyPackage,
  serializePublicKeyPackage,
  type TeddsaKeygenOutputBytes,
} from "@oko-wallet/teddsa-hooks";
import { reqKeygenEd25519 } from "@oko-wallet/teddsa-api-lib";
import { reqKeygenV2 } from "@oko-wallet/api-lib";

import type { ReferralInfo } from "@oko-wallet-attached/store/memory/types";
import { teddsaKeygenToHex } from "@oko-wallet-attached/crypto/keygen_ed25519";
import {
  splitTeddsaSigningShare,
  extractSigningShare,
  combineTeddsaShares,
  reconstructKeyPackage,
  keyPackageToRaw,
  getClientFrostIdentifier,
  getServerFrostIdentifier,
} from "@oko-wallet-attached/crypto/sss_ed25519";
import { computeVerifyingShare } from "@oko-wallet-attached/crypto/scalar";
import {
  teddsaKeyShareToHex,
  hexToTeddsaKeyShare,
  type TeddsaKeyShareByNode,
} from "@oko-wallet/oko-types/user_key_share";
import type { PublicKeyPackageRaw } from "@oko-wallet/oko-types/teddsa";
import { Bytes } from "@oko-wallet/bytes";

/**
 * Handle new user who needs both secp256k1 and ed25519 keygen.
 */
export async function handleNewUserV2(
  idToken: string,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
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
  } = ed25519KeygenSplitRes.data;

  // 3. secp256k1 key share split
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

  // 5. Send key shares by both curves to ks nodes using V2 API
  const registerKeySharesResults: Result<void, string>[] = await Promise.all(
    secp256k1UserKeyShares.map((keyShareByNode, index) =>
      registerKeySharesV2(keyShareByNode.node.endpoint, idToken, authType, {
        secp256k1: {
          public_key: secp256k1Keygen1.public_key.toHex(),
          share: encodePoint256ToKeyShareString(keyShareByNode.share),
        },
        ed25519: {
          public_key: ed25519Keygen1.public_key.toHex(),
          share: teddsaKeyShareToHex(ed25519UserKeyShares[index].share),
        },
      }),
    ),
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

  // 6. Call V2 keygen API with both curve types
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
    },
    idToken,
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
      isNewUser: true,
      email: reqKeygenV2Res.data.user.email ?? null,
      name: reqKeygenV2Res.data.user.name ?? null,
    },
  };
}

/**
 * Handle existing user who has both secp256k1 and ed25519 wallets.
 * Called when checkEmailV2 returns CheckEmailResponseV2ExistingUser with both wallets.
 */
export async function handleExistingUserV2(
  idToken: string,
  keyshareNodeMetaSecp256k1: KeyShareNodeMetaWithNodeStatusInfo,
  keyshareNodeMetaEd25519: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  // 1. Sign in to API server
  const signInResult = await signInV2(idToken, authType);
  if (!signInResult.success) {
    return { success: false, err: signInResult.err };
  }
  const signInResp = signInResult.data;

  // 2. Request secp256k1 and ed25519 shares from KS nodes using V2 API
  const requestSharesRes = await requestKeySharesV2(
    idToken,
    keyshareNodeMetaSecp256k1.nodes,
    keyshareNodeMetaSecp256k1.threshold,
    authType,
    {
      secp256k1: signInResp.user.public_key_secp256k1,
      ed25519: signInResp.user.public_key_ed25519,
    },
  );
  if (!requestSharesRes.success) {
    const error = requestSharesRes.err;

    if (error.code === "WALLET_NOT_FOUND") {
      console.error(
        "[attached] detected share loss on node: %s",
        error.affectedNode?.name,
      );
      // TODO: handle reshare case for V2
      return {
        success: false,
        err: {
          type: "reshare_fail",
          error: `Wallet not found on node: ${error.affectedNode?.name}`,
        },
      };
    }

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

  // 3. Decode and combine secp256k1 shares
  const secp256k1DecodeRes = await decodeSecp256k1SharesByNode(
    requestSharesRes.data,
  );
  if (!secp256k1DecodeRes.success) {
    return { success: false, err: secp256k1DecodeRes.err };
  }

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

  // 4. Combine ed25519 shares
  const ed25519SharesByNode: TeddsaKeyShareByNode[] = [];
  for (const item of requestSharesRes.data) {
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

  // Combine shares to recover signing_share
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

  // Reconstruct KeyPackage
  const clientIdentifierRes = getClientFrostIdentifier();
  if (!clientIdentifierRes.success) {
    return {
      success: false,
      err: {
        type: "key_share_combine_fail",
        error: `client identifier err: ${clientIdentifierRes.err}`,
      },
    };
  }

  const keyPackage = reconstructKeyPackage(
    signingShareRes.data,
    clientIdentifierRes.data,
    verifyingKey,
    keyshareNodeMetaEd25519.threshold,
  );
  const keyPackageRaw = keyPackageToRaw(keyPackage);

  // Build PublicKeyPackageRaw with both client and server verifying_shares
  const serverIdentifierRes = getServerFrostIdentifier();
  if (!serverIdentifierRes.success) {
    return {
      success: false,
      err: {
        type: "key_share_combine_fail",
        error: `server identifier err: ${serverIdentifierRes.err}`,
      },
    };
  }

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

  const clientVerifyingShare = computeVerifyingShare(signingShareRes.data);
  const publicKeyPackageRaw: PublicKeyPackageRaw = {
    verifying_shares: [
      {
        identifier: clientIdentifierRes.data.toHex(),
        share: [...clientVerifyingShare.toUint8Array()],
      },
      {
        identifier: serverIdentifierRes.data.toHex(),
        share: [...serverVerifyingShareRes.data.toUint8Array()],
      },
    ],
    verifying_key: [...verifyingKey.toUint8Array()],
  };

  // Create hex-encoded strings for storage
  const keyPackageEd25519 = Buffer.from(JSON.stringify(keyPackageRaw)).toString(
    "hex",
  );
  const publicKeyPackageEd25519 = Buffer.from(
    JSON.stringify(publicKeyPackageRaw),
  ).toString("hex");

  return {
    success: true,
    data: {
      publicKeySecp256k1: signInResp.user.public_key_secp256k1,
      publicKeyEd25519: signInResp.user.public_key_ed25519,
      walletIdSecp256k1: signInResp.user.wallet_id_secp256k1,
      walletIdEd25519: signInResp.user.wallet_id_ed25519,
      jwtToken: signInResp.token,
      keyshare1Secp256k1: keyshare1Secp256k1Res.data,
      keyPackageEd25519,
      publicKeyPackageEd25519,
      isNewUser: false,
      email: signInResp.user.email ?? null,
      name: signInResp.user.name ?? null,
    },
  };
}

/**
 * Handle existing user who has secp256k1 wallet but needs ed25519 keygen.
 * Called when checkEmailV2 returns CheckEmailResponseV2NeedsEd25519Keygen.
 *
 * Flow: ed25519 keygen first -> get secp256k1 public_key from response -> combine secp256k1 shares
 */
export async function handleExistingUserNeedsEd25519Keygen(
  idToken: string,
  keyshareNodeMetaSecp256k1: KeyShareNodeMetaWithNodeStatusInfo,
  keyshareNodeMetaEd25519: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  // 1. ed25519 keygen and split
  const ed25519KeygenSplitRes = await runEd25519KeygenAndSplit(
    keyshareNodeMetaEd25519,
  );
  if (ed25519KeygenSplitRes.success === false) {
    return { success: false, err: ed25519KeygenSplitRes.err };
  }
  const {
    keygen1: ed25519Keygen1,
    keygen2: ed25519Keygen2,
    userKeyShares: ed25519UserKeyShares,
  } = ed25519KeygenSplitRes.data;

  // 2. Send ed25519 key shares to ks nodes using V2 API
  const registerEd25519Results: Result<void, string>[] = await Promise.all(
    keyshareNodeMetaEd25519.nodes.map((node, index) =>
      registerKeyShareEd25519V2(
        node.endpoint,
        idToken,
        authType,
        ed25519Keygen1.public_key.toHex(),
        teddsaKeyShareToHex(ed25519UserKeyShares[index].share),
      ),
    ),
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

  // 4. Call keygenEd25519 API
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
  );
  if (reqKeygenEd25519Res.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: reqKeygenEd25519Res.msg },
    };
  }

  // 5. Get secp256k1 public key from keygenEd25519 response
  const secp256k1PublicKey = reqKeygenEd25519Res.data.user.public_key_secp256k1;

  // 6. Request secp256k1 shares from KS nodes using V2 API
  const requestSharesRes = await requestKeySharesV2(
    idToken,
    keyshareNodeMetaSecp256k1.nodes,
    keyshareNodeMetaSecp256k1.threshold,
    authType,
    {
      secp256k1: secp256k1PublicKey,
    },
  );
  if (!requestSharesRes.success) {
    const error = requestSharesRes.err;

    if (error.code === "WALLET_NOT_FOUND") {
      console.error(
        "[attached] detected share loss on node: %s",
        error.affectedNode?.name,
      );
      return {
        success: false,
        err: {
          type: "reshare_fail",
          error: `Wallet not found on node: ${error.affectedNode?.name}`,
        },
      };
    }

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

  // 6. Decode and combine secp256k1 shares
  const secp256k1DecodeRes = await decodeSecp256k1SharesByNode(
    requestSharesRes.data,
  );
  if (!secp256k1DecodeRes.success) {
    return { success: false, err: secp256k1DecodeRes.err };
  }

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

  // 7. Convert ed25519 keygen1 to hex format for storage
  const keyPackageEd25519Hex = teddsaKeygenToHex(ed25519Keygen1);

  return {
    success: true,
    data: {
      publicKeySecp256k1: reqKeygenEd25519Res.data.user.public_key_secp256k1,
      publicKeyEd25519: reqKeygenEd25519Res.data.user.public_key_ed25519,
      walletIdSecp256k1: reqKeygenEd25519Res.data.user.wallet_id_secp256k1,
      walletIdEd25519: reqKeygenEd25519Res.data.user.wallet_id_ed25519,
      jwtToken: reqKeygenEd25519Res.data.token,
      keyshare1Secp256k1: keyshare1Secp256k1Res.data,
      keyPackageEd25519: keyPackageEd25519Hex.keyPackage,
      publicKeyPackageEd25519: keyPackageEd25519Hex.publicKeyPackage,
      isNewUser: false,
      email: reqKeygenEd25519Res.data.user.email ?? null,
      name: reqKeygenEd25519Res.data.user.name ?? null,
    },
  };
}

export async function checkUserExistsV2(
  email: string,
  authType: AuthType,
): Promise<Result<OkoApiResponse<CheckEmailResponseV2>, FetchError>> {
  const res = await makeOkoApiRequest<CheckEmailRequest, CheckEmailResponseV2>(
    "user/check",
    {
      email,
      auth_type: authType,
    },
    TSS_V2_ENDPOINT,
  );

  return res;
}

/**
 * Handle reshare for existing user with both secp256k1 and ed25519 wallets.
 * Called when checkEmailV2 indicates needs_reshare for either curve.
 */
export async function handleReshareV2(
  idToken: string,
  keyshareNodeMetaSecp256k1: KeyShareNodeMetaWithNodeStatusInfo,
  keyshareNodeMetaEd25519: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
  secp256k1NeedsReshare: boolean,
  ed25519NeedsReshare: boolean,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  // 1. Sign in to API server to get public keys and server verifying share
  const signInResult = await signInV2(idToken, authType);
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

  // 2. Call reshareUserKeySharesV2
  const reshareRes = await reshareUserKeySharesV2(
    idToken,
    authType,
    {
      publicKey: publicKeySecp256k1Res.data,
      keyshareNodeMeta: keyshareNodeMetaSecp256k1,
      needsReshare: secp256k1NeedsReshare,
    },
    {
      publicKey: publicKeyEd25519Res.data,
      keyshareNodeMeta: keyshareNodeMetaEd25519,
      serverVerifyingShare: serverVerifyingShareRes.data,
      needsReshare: ed25519NeedsReshare,
    },
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
      isNewUser: false,
      email: signInResp.user.email ?? null,
      name: signInResp.user.name ?? null,
    },
  };
}

/**
 * Handle reshare for secp256k1 + keygen for ed25519 (scenario 6).
 * Called when user has secp256k1 wallet, needs reshare, and needs ed25519 keygen.
 */
export async function handleReshareAndEd25519Keygen(
  idToken: string,
  keyshareNodeMetaSecp256k1: KeyShareNodeMetaWithNodeStatusInfo,
  keyshareNodeMetaEd25519: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  // 1. Classify nodes
  const activeNodes = keyshareNodeMetaSecp256k1.nodes.filter(
    (n) => n.wallet_status === "ACTIVE",
  );
  const additionalNodes = keyshareNodeMetaSecp256k1.nodes.filter(
    (n) =>
      n.wallet_status === "NOT_REGISTERED" ||
      n.wallet_status === "UNRECOVERABLE_DATA_LOSS",
  );

  if (activeNodes.length < keyshareNodeMetaSecp256k1.threshold) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: "insufficient existing KS nodes for reshare",
      },
    };
  }

  // 2. ed25519 keygen and split
  const ed25519KeygenSplitRes = await runEd25519KeygenAndSplit(
    keyshareNodeMetaEd25519,
  );
  if (ed25519KeygenSplitRes.success === false) {
    return { success: false, err: ed25519KeygenSplitRes.err };
  }
  const {
    keygen1: ed25519Keygen1,
    keygen2: ed25519Keygen2,
    userKeyShares: ed25519UserKeyShares,
  } = ed25519KeygenSplitRes.data;

  // 3. Sign in to get the public key
  const signInResult = await signInV2(idToken, authType);
  if (!signInResult.success) {
    return { success: false, err: signInResult.err };
  }
  const signInResp = signInResult.data;
  const secp256k1PublicKey = signInResp.user.public_key_secp256k1;

  // 4. Request secp256k1 shares with public key
  const requestSecp256k1SharesRes = await requestKeySharesV2(
    idToken,
    activeNodes,
    keyshareNodeMetaSecp256k1.threshold,
    authType,
    {
      secp256k1: secp256k1PublicKey,
    },
  );
  if (!requestSecp256k1SharesRes.success) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: `Failed to request secp256k1 shares: ${requestSecp256k1SharesRes.err.code}`,
      },
    };
  }

  // 5. Decode secp256k1 shares (filter out items without shares for reshare case)
  const itemsWithSecp256k1 = requestSecp256k1SharesRes.data.filter(
    (item) => item.shares.secp256k1,
  );
  const secp256k1DecodeRes =
    await decodeSecp256k1SharesByNode(itemsWithSecp256k1);
  if (!secp256k1DecodeRes.success) {
    return {
      success: false,
      err: {
        type: "reshare_fail",
        error: secp256k1DecodeRes.err.error,
      },
    };
  }

  // 6. Expand secp256k1 shares to additional nodes
  const secp256k1ExpandRes = await runExpandShares(
    secp256k1DecodeRes.data,
    additionalNodes,
    keyshareNodeMetaSecp256k1.threshold,
  );
  if (!secp256k1ExpandRes.success) {
    return {
      success: false,
      err: { type: "reshare_fail", error: secp256k1ExpandRes.err },
    };
  }

  // 7. Send shares to KSN
  // For ACTIVE nodes: reshare secp256k1 + register ed25519
  // For new nodes: reshare/register both
  const allNodes = keyshareNodeMetaSecp256k1.nodes;
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
        const nodeStatus = allNodes.find(
          (n) => n.endpoint === node.endpoint,
        )?.wallet_status;

        const isNewNode =
          nodeStatus === "NOT_REGISTERED" ||
          nodeStatus === "UNRECOVERABLE_DATA_LOSS";

        if (isNewNode) {
          // New node: reshare/register both curves
          return reshareRegisterV2(node.endpoint, idToken, authType, {
            secp256k1: {
              public_key: secp256k1PublicKey,
              share: encodePoint256ToKeyShareString(secp256k1Share.share),
            },
            ed25519: {
              public_key: ed25519Keygen1.public_key.toHex(),
              share: teddsaKeyShareToHex(ed25519Share.share),
            },
          });
        } else {
          // ACTIVE node: reshare secp256k1 + register ed25519 separately
          const reshareSecp256k1Res = await reshareKeySharesV2(
            node.endpoint,
            idToken,
            authType,
            {
              secp256k1: {
                public_key: secp256k1PublicKey,
                share: encodePoint256ToKeyShareString(secp256k1Share.share),
              },
            },
          );
          if (!reshareSecp256k1Res.success) {
            return reshareSecp256k1Res;
          }

          return registerKeyShareEd25519V2(
            node.endpoint,
            idToken,
            authType,
            ed25519Keygen1.public_key.toHex(),
            teddsaKeyShareToHex(ed25519Share.share),
          );
        }
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

  // 8. Call keygenEd25519 API
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
  );
  if (reqKeygenEd25519Res.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: reqKeygenEd25519Res.msg },
    };
  }

  // 9. Update Oko API reshare status
  const resharedNodes = secp256k1ExpandRes.data.reshared_user_key_shares.map(
    (s) => s.node,
  );
  const updateRes = await makeAuthorizedOkoApiRequest<ReshareRequestV2, void>(
    "user/reshare",
    idToken,
    {
      wallets: {
        secp256k1: {
          public_key: secp256k1PublicKey,
          reshared_key_shares: resharedNodes,
        },
      },
    },
    TSS_V2_ENDPOINT,
  );
  if (!updateRes.success) {
    console.warn("[attached] Failed to update reshare status:", updateRes.err);
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
      keyshare1Secp256k1: secp256k1ExpandRes.data.original_secret.toHex(),
      keyPackageEd25519: keyPackageEd25519Hex.keyPackage,
      publicKeyPackageEd25519: keyPackageEd25519Hex.publicKeyPackage,
      isNewUser: false,
      email: reqKeygenEd25519Res.data.user.email ?? null,
      name: reqKeygenEd25519Res.data.user.name ?? null,
    },
  };
}

interface SaveReferralRequest {
  origin: string;
  utm_source: string | null;
  utm_campaign: string | null;
}

interface SaveReferralResponse {
  referral_id: string;
}

async function saveReferralV2(
  authToken: string,
  data: SaveReferralRequest,
): Promise<void> {
  const res = await makeAuthorizedOkoApiRequest<
    SaveReferralRequest,
    SaveReferralResponse
  >("referral", authToken, data, SOCIAL_LOGIN_V2_ENDPOINT);

  if (!res.success) {
    throw new Error(
      `Save referral V2 fetch failed: ${JSON.stringify(res.err)}`,
    );
  }

  const apiResponse = res.data;
  if (!apiResponse.success) {
    throw new Error(`Save referral V2 API error: ${apiResponse.msg}`);
  }
}

/**
 * Decode secp256k1 shares from hex strings to Point256 format.
 * Used by multiple handlers that need to process shares from KS nodes.
 */
async function decodeSecp256k1SharesByNode(
  sharesData: Array<{
    node: { name: string; endpoint: string };
    shares: { secp256k1?: string };
  }>,
): Promise<
  Result<
    UserKeySharePointByNode[],
    { type: "key_share_combine_fail"; error: string }
  >
> {
  const sharesByNode: UserKeySharePointByNode[] = [];

  for (const item of sharesData) {
    const shareHex = item.shares.secp256k1;
    if (!shareHex) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `secp256k1 share missing from node: ${item.node.name}`,
        },
      };
    }
    const point256Res = decodeKeyShareStringToPoint256(shareHex);
    if (point256Res.success === false) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `secp256k1 decode err: ${point256Res.err}`,
        },
      };
    }
    sharesByNode.push({
      node: item.node,
      share: point256Res.data,
    });
  }

  return { success: true, data: sharesByNode };
}

interface Ed25519KeygenSplitResult {
  keygen1: TeddsaKeygenOutputBytes;
  keygen2: TeddsaKeygenOutputBytes;
  userKeyShares: TeddsaKeyShareByNode[];
}

/**
 * Run ed25519 keygen and split the signing share for distribution to KS nodes.
 * Used by handlers that need to create new ed25519 wallets.
 */
async function runEd25519KeygenAndSplit(
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
): Promise<
  Result<
    Ed25519KeygenSplitResult,
    { type: "sign_in_request_fail"; error: string }
  >
> {
  // 1. ed25519 keygen
  const ed25519KeygenRes = await runTeddsaKeygen();
  if (ed25519KeygenRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: ed25519KeygenRes.err },
    };
  }
  const { keygen_1: keygen1, keygen_2: keygen2 } = ed25519KeygenRes.data;

  // 2. Extract signing share from key package
  const signingShareRes = extractSigningShare(keygen1.key_package);
  if (signingShareRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: signingShareRes.err },
    };
  }

  // 3. Split signing share for distribution
  const splitRes = await splitTeddsaSigningShare(
    signingShareRes.data,
    keyshareNodeMeta,
  );
  if (splitRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: splitRes.err },
    };
  }

  return {
    success: true,
    data: {
      keygen1,
      keygen2,
      userKeyShares: splitRes.data,
    },
  };
}

interface SignInRequestV2 {
  auth_type: AuthType;
}

/**
 * Sign in to API server and return user data.
 * Used by handlers that need to authenticate before requesting shares.
 */
async function signInV2(
  idToken: string,
  authType: AuthType,
): Promise<Result<SignInResponseV2, { type: "sign_in_request_fail"; error: string }>> {
  const signInRes = await makeAuthorizedOkoApiRequest<
    SignInRequestV2,
    SignInResponseV2
  >("user/signin", idToken, { auth_type: authType }, TSS_V2_ENDPOINT);

  if (!signInRes.success) {
    console.error("[attached] sign in failed, err: %s", signInRes.err);
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: signInRes.err.toString() },
    };
  }

  const apiResponse = signInRes.data;
  if (!apiResponse.success) {
    console.error(
      "[attached] sign in request failed, err: %s",
      apiResponse.msg,
    );
    return {
      success: false,
      err: {
        type: "sign_in_request_fail",
        error: `code: ${apiResponse.code}`,
      },
    };
  }

  return { success: true, data: apiResponse.data };
}
