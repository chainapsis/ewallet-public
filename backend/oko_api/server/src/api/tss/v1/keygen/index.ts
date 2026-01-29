import { Pool } from "pg";
import type { Logger } from "winston";
import {
  createUser,
  getUserByEmailAndAuthType,
  updateUserMetadata,
} from "@oko-wallet/oko-pg-interface/oko_users";
import type { Result } from "@oko-wallet/stdlib-js";
import { encryptDataAsync } from "@oko-wallet/crypto-js/node";
import { Bytes, type Bytes33 } from "@oko-wallet/bytes";
import { type WalletStatus, type Wallet } from "@oko-wallet/oko-types/wallets";
import type { KeygenRequest } from "@oko-wallet/oko-types/tss";
import type { SignInResponse, User } from "@oko-wallet/oko-types/user";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import {
  createWallet,
  getActiveWalletByUserIdAndCurveType,
  getWalletByPublicKey,
} from "@oko-wallet/oko-pg-interface/oko_wallets";
import {
  createWalletKSNodes,
  getActiveKSNodes,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import { getKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";

import { generateUserToken } from "@oko-wallet-api/api/tss/keplr_auth";
import { checkKeyShareFromKSNodes } from "@oko-wallet-api/api/tss/ks_node";

export async function runKeygen(
  db: Pool,
  jwtConfig: {
    secret: string;
    expires_in: string;
  },
  keygenRequest: KeygenRequest,
  encryptionSecret: string,
  logger: Logger,
): Promise<OkoApiResponse<SignInResponse>> {
  try {
    const { auth_type, user_identifier, keygen_2, email, name, metadata } = keygenRequest;

    const getUserRes = await getUserByEmailAndAuthType(
      db,
      user_identifier,
      auth_type,
    );
    if (getUserRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getUserByEmailAndAuthType error: ${getUserRes.err}`,
      };
    }

    let user: User;
    if (getUserRes.data !== null) {
      user = getUserRes.data;

      // Update user metadata if user already exists
      if (metadata) {
        const updateMetadataRes = await updateUserMetadata(db, user.user_id, metadata);
        if (updateMetadataRes.success === false) {
          logger.error(`Failed to update user metadata: ${updateMetadataRes.err}`);
        }
      }

      const getActiveWalletRes = await getActiveWalletByUserIdAndCurveType(
        db,
        user.user_id,
        "secp256k1",
      );
      if (getActiveWalletRes.success === false) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `getActiveWalletByUserIdAndCurveType error: ${getActiveWalletRes.err}`,
        };
      }
      if (getActiveWalletRes.data !== null) {
        return {
          success: false,
          code: "WALLET_ALREADY_EXISTS",
          msg: `Wallet already exists: ${getActiveWalletRes.data.public_key.toString("hex")}`,
        };
      }
    } else {
      const createUserRes = await createUser(db, user_identifier, auth_type, metadata);
      if (createUserRes.success === false) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `createUser error: ${createUserRes.err}`,
        };
      }
      user = createUserRes.data;
    }

    const publicKeyRes: Result<Bytes33, string> = Bytes.fromHexString(
      keygen_2.public_key,
      33,
    );
    if (publicKeyRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `publicKeyRes error: ${publicKeyRes.err}`,
      };
    }
    const publicKeyBytes = publicKeyRes.data;

    const walletByPublicKeyRes = await getWalletByPublicKey(
      db,
      Buffer.from(publicKeyBytes.toUint8Array()),
    );
    if (walletByPublicKeyRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getWalletByPublicKey error: ${walletByPublicKeyRes.err}`,
      };
    }
    if (walletByPublicKeyRes.data !== null) {
      return {
        success: false,
        code: "DUPLICATE_PUBLIC_KEY",
        msg: `Duplicate public key: ${keygen_2.public_key}`,
      };
    }

    const getActiveKSNodesRes = await getActiveKSNodes(db);
    if (getActiveKSNodesRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveKSNodes error: ${getActiveKSNodesRes.err}`,
      };
    }
    const activeKSNodes = getActiveKSNodesRes.data;

    const checkKeyshareFromKSNodesRes = await checkKeyShareFromKSNodes(
      user_identifier,
      publicKeyBytes,
      activeKSNodes,
      auth_type,
      "secp256k1",
    );
    if (checkKeyshareFromKSNodesRes.success === false) {
      return checkKeyshareFromKSNodesRes;
    }

    const ksNodeIds: string[] = checkKeyshareFromKSNodesRes.data.nodeIds;
    if (ksNodeIds.length === 0) {
      return {
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: `no active ks nodes`,
      };
    }

    const encryptedShare = await encryptDataAsync(
      keygen_2.private_share,
      encryptionSecret,
    );
    const encryptedShareBuffer = Buffer.from(encryptedShare, "utf-8");

    const getKeyshareNodeMetaRes = await getKeyShareNodeMeta(db);
    if (getKeyshareNodeMetaRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getKeyShareNodeMeta error: ${getKeyshareNodeMetaRes.err}`,
      };
    }
    const globalSSSThreshold = getKeyshareNodeMetaRes.data.sss_threshold;

    let wallet: Wallet;
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const createWalletRes = await createWallet(client, {
        user_id: user.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKeyBytes.toUint8Array()),
        enc_tss_share: encryptedShareBuffer,
        sss_threshold: globalSSSThreshold,
        status: "ACTIVE" as WalletStatus,
      });
      if (createWalletRes.success === false) {
        throw new Error(`createWallet error: ${createWalletRes.err}`);
      }
      wallet = createWalletRes.data;

      const createWalletKSNodesRes = await createWalletKSNodes(
        client,
        wallet.wallet_id,
        ksNodeIds,
      );
      if (createWalletKSNodesRes.success === false) {
        throw new Error(
          `createWalletKSNodes error: ${createWalletKSNodesRes.err}`,
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: error instanceof Error ? error.message : String(error),
      };
    } finally {
      client.release();
    }

    const tokenResult = generateUserToken({
      wallet_id: wallet.wallet_id,
      email: user_identifier,
      jwt_config: jwtConfig,
    });

    if (!tokenResult.success) {
      return {
        success: false,
        code: "FAILED_TO_GENERATE_TOKEN",
        msg: `generateUserToken error: ${tokenResult.err}`,
      };
    }

    return {
      success: true,
      data: {
        token: tokenResult.data.token,
        user: {
          wallet_id: wallet.wallet_id,
          public_key: keygen_2.public_key,
          user_identifier: user_identifier,
          email: email ?? null,
          name: name ?? null,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runKeygen error: ${error}`,
    };
  }
}
