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
import type {
  KeygenRequestV2,
  KeygenEd25519Request,
} from "@oko-wallet/oko-types/tss";
import type { SignInResponseV2, User } from "@oko-wallet/oko-types/user";
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

import { generateUserTokenV2 } from "@oko-wallet-api/api/tss/keplr_auth";
import { checkKeyShareFromKSNodesV2 } from "@oko-wallet-api/api/tss/ks_node";
import { extractKeyPackageSharesEd25519 } from "@oko-wallet/teddsa-addon/src/server";

export async function runKeygenV2(
  db: Pool,
  jwtConfig: {
    secret: string;
    expires_in: string;
  },
  keygenRequest: KeygenRequestV2,
  encryptionSecret: string,
  logger: Logger,
): Promise<OkoApiResponse<SignInResponseV2>> {
  try {
    const {
      auth_type,
      user_identifier,
      keygen_2_secp256k1,
      keygen_2_ed25519,
      email,
      name,
      metadata,
    } = keygenRequest;

    // 1. Get or create user
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

      // Check if secp256k1 wallet already exists
      const getSecp256k1WalletRes = await getActiveWalletByUserIdAndCurveType(
        db,
        user.user_id,
        "secp256k1",
      );
      if (getSecp256k1WalletRes.success === false) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `getActiveWalletByUserIdAndCurveType (secp256k1) error: ${getSecp256k1WalletRes.err}`,
        };
      }
      if (getSecp256k1WalletRes.data !== null) {
        return {
          success: false,
          code: "WALLET_ALREADY_EXISTS",
          msg: `Secp256k1 wallet already exists: ${getSecp256k1WalletRes.data.public_key.toString("hex")}`,
        };
      }

      // Check if ed25519 wallet already exists
      const getEd25519WalletRes = await getActiveWalletByUserIdAndCurveType(
        db,
        user.user_id,
        "ed25519",
      );
      if (getEd25519WalletRes.success === false) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `getActiveWalletByUserIdAndCurveType (ed25519) error: ${getEd25519WalletRes.err}`,
        };
      }
      if (getEd25519WalletRes.data !== null) {
        return {
          success: false,
          code: "WALLET_ALREADY_EXISTS",
          msg: `Ed25519 wallet already exists: ${getEd25519WalletRes.data.public_key.toString("hex")}`,
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

    // 2. Validate secp256k1 public key
    const secp256k1PublicKeyRes: Result<Bytes33, string> = Bytes.fromHexString(
      keygen_2_secp256k1.public_key,
      33,
    );
    if (secp256k1PublicKeyRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `secp256k1 publicKeyRes error: ${secp256k1PublicKeyRes.err}`,
      };
    }
    const secp256k1PublicKeyBytes = secp256k1PublicKeyRes.data;

    // Check for duplicate secp256k1 public key
    const secp256k1WalletByPkRes = await getWalletByPublicKey(
      db,
      Buffer.from(secp256k1PublicKeyBytes.toUint8Array()),
    );
    if (secp256k1WalletByPkRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getWalletByPublicKey (secp256k1) error: ${secp256k1WalletByPkRes.err}`,
      };
    }
    if (secp256k1WalletByPkRes.data !== null) {
      return {
        success: false,
        code: "DUPLICATE_PUBLIC_KEY",
        msg: `Duplicate secp256k1 public key: ${keygen_2_secp256k1.public_key}`,
      };
    }

    // 3. Validate ed25519 public key
    const ed25519PublicKeyUint8 = new Uint8Array(keygen_2_ed25519.public_key);
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKeyUint8).toString(
      "hex",
    );

    const ed25519PublicKeyRes = Bytes.fromUint8Array(ed25519PublicKeyUint8, 32);
    if (ed25519PublicKeyRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `ed25519 publicKeyRes error: ${ed25519PublicKeyRes.err}`,
      };
    }
    const ed25519PublicKeyBytes = ed25519PublicKeyRes.data;

    // Check for duplicate ed25519 public key
    const ed25519WalletByPkRes = await getWalletByPublicKey(
      db,
      Buffer.from(ed25519PublicKeyBytes.toUint8Array()),
    );
    if (ed25519WalletByPkRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getWalletByPublicKey (ed25519) error: ${ed25519WalletByPkRes.err}`,
      };
    }
    if (ed25519WalletByPkRes.data !== null) {
      return {
        success: false,
        code: "DUPLICATE_PUBLIC_KEY",
        msg: `Duplicate ed25519 public key: ${ed25519PublicKeyHex}`,
      };
    }

    // 4. Get active KS nodes
    const getActiveKSNodesRes = await getActiveKSNodes(db);
    if (getActiveKSNodesRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveKSNodes error: ${getActiveKSNodesRes.err}`,
      };
    }
    const activeKSNodes = getActiveKSNodesRes.data;

    // 5. Check keyshare from KS nodes for both curve types
    const checkKeyshareV2Res = await checkKeyShareFromKSNodesV2(
      user_identifier,
      {
        secp256k1: secp256k1PublicKeyBytes,
        ed25519: ed25519PublicKeyBytes,
      },
      activeKSNodes,
      auth_type,
    );
    if (checkKeyshareV2Res.success === false) {
      return checkKeyshareV2Res;
    }

    const secp256k1KsNodeIds: string[] =
      checkKeyshareV2Res.data.secp256k1?.nodeIds ?? [];
    const ed25519KsNodeIds: string[] =
      checkKeyshareV2Res.data.ed25519?.nodeIds ?? [];

    if (secp256k1KsNodeIds.length === 0) {
      return {
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: `no active ks nodes for secp256k1`,
      };
    }

    if (ed25519KsNodeIds.length === 0) {
      return {
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: `no active ks nodes for ed25519`,
      };
    }

    // 6. Encrypt secp256k1 share
    const secp256k1EncryptedShare = await encryptDataAsync(
      keygen_2_secp256k1.private_share,
      encryptionSecret,
    );
    const secp256k1EncryptedShareBuffer = Buffer.from(
      secp256k1EncryptedShare,
      "utf-8",
    );

    // 7. Encrypt ed25519 share (extract signing_share and verifying_share)
    const ed25519KeyPackageShares = extractKeyPackageSharesEd25519(
      new Uint8Array(keygen_2_ed25519.key_package),
    );
    const ed25519SharesData = {
      signing_share: ed25519KeyPackageShares.signing_share,
      verifying_share: ed25519KeyPackageShares.verifying_share,
    };
    const ed25519EncryptedShare = await encryptDataAsync(
      JSON.stringify(ed25519SharesData),
      encryptionSecret,
    );
    const ed25519EncryptedShareBuffer = Buffer.from(
      ed25519EncryptedShare,
      "utf-8",
    );
    const serverVerifyingShareEd25519Hex = Buffer.from(
      ed25519KeyPackageShares.verifying_share,
    ).toString("hex");

    // 8. Get SSS threshold
    const getKeyshareNodeMetaRes = await getKeyShareNodeMeta(db);
    if (getKeyshareNodeMetaRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getKeyShareNodeMeta error: ${getKeyshareNodeMetaRes.err}`,
      };
    }
    const globalSSSThreshold = getKeyshareNodeMetaRes.data.sss_threshold;

    // 9. Create both wallets in a transaction
    let secp256k1Wallet: Wallet;
    let ed25519Wallet: Wallet;
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Create secp256k1 wallet
      const createSecp256k1WalletRes = await createWallet(client, {
        user_id: user.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(secp256k1PublicKeyBytes.toUint8Array()),
        enc_tss_share: secp256k1EncryptedShareBuffer,
        sss_threshold: globalSSSThreshold,
        status: "ACTIVE" as WalletStatus,
      });
      if (createSecp256k1WalletRes.success === false) {
        throw new Error(
          `createWallet (secp256k1) error: ${createSecp256k1WalletRes.err}`,
        );
      }
      secp256k1Wallet = createSecp256k1WalletRes.data;

      const createSecp256k1KSNodesRes = await createWalletKSNodes(
        client,
        secp256k1Wallet.wallet_id,
        secp256k1KsNodeIds,
      );
      if (createSecp256k1KSNodesRes.success === false) {
        throw new Error(
          `createWalletKSNodes (secp256k1) error: ${createSecp256k1KSNodesRes.err}`,
        );
      }

      // Create ed25519 wallet
      const createEd25519WalletRes = await createWallet(client, {
        user_id: user.user_id,
        curve_type: "ed25519",
        public_key: Buffer.from(ed25519PublicKeyBytes.toUint8Array()),
        enc_tss_share: ed25519EncryptedShareBuffer,
        sss_threshold: globalSSSThreshold,
        status: "ACTIVE" as WalletStatus,
      });
      if (createEd25519WalletRes.success === false) {
        throw new Error(
          `createWallet (ed25519) error: ${createEd25519WalletRes.err}`,
        );
      }
      ed25519Wallet = createEd25519WalletRes.data;

      const createEd25519KSNodesRes = await createWalletKSNodes(
        client,
        ed25519Wallet.wallet_id,
        ed25519KsNodeIds,
      );
      if (createEd25519KSNodesRes.success === false) {
        throw new Error(
          `createWalletKSNodes (ed25519) error: ${createEd25519KSNodesRes.err}`,
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

    // 10. Generate token
    const tokenResult = generateUserTokenV2({
      wallet_id_secp256k1: secp256k1Wallet.wallet_id,
      wallet_id_ed25519: ed25519Wallet.wallet_id,
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
          wallet_id_secp256k1: secp256k1Wallet.wallet_id,
          wallet_id_ed25519: ed25519Wallet.wallet_id,
          public_key_secp256k1: keygen_2_secp256k1.public_key,
          public_key_ed25519: ed25519PublicKeyHex,
          server_verifying_share_ed25519: serverVerifyingShareEd25519Hex,
          user_identifier,
          email: email ?? null,
          name: name ?? null,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runKeygenV2 error: ${error}`,
    };
  }
}

export async function runKeygenEd25519(
  db: Pool,
  jwtConfig: {
    secret: string;
    expires_in: string;
  },
  keygenRequest: KeygenEd25519Request,
  encryptionSecret: string,
  logger: Logger,
): Promise<OkoApiResponse<SignInResponseV2>> {
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

    // in keygen_ed25519, user must exist
    if (getUserRes.data === null) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: `User not found`,
      };
    }

    const user = getUserRes.data;

    // Update user metadata on keygen_ed25519
    if (metadata) {
      const updateMetadataRes = await updateUserMetadata(db, user.user_id, metadata);
      if (updateMetadataRes.success === false) {
        logger.error(`Failed to update user metadata: ${updateMetadataRes.err}`);
      }
    }

    // in keygen_ed25519, secp256k1 wallet must exist
    const getSecp256k1WalletRes = await getActiveWalletByUserIdAndCurveType(
      db,
      user.user_id,
      "secp256k1",
    );
    if (getSecp256k1WalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveWalletByUserIdAndCurveType (secp256k1) error: ${getSecp256k1WalletRes.err}`,
      };
    }
    if (getSecp256k1WalletRes.data === null) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: `Secp256k1 wallet not found`,
      };
    }
    const secp256k1Wallet = getSecp256k1WalletRes.data;

    // Check if ed25519 wallet already exists
    const getEd25519WalletRes = await getActiveWalletByUserIdAndCurveType(
      db,
      user.user_id,
      "ed25519",
    );
    if (getEd25519WalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveWalletByUserIdAndCurveType (ed25519) error: ${getEd25519WalletRes.err}`,
      };
    }
    if (getEd25519WalletRes.data !== null) {
      return {
        success: false,
        code: "WALLET_ALREADY_EXISTS",
        msg: `Ed25519 wallet already exists: ${getEd25519WalletRes.data.public_key.toString("hex")}`,
      };
    }

    const ed25519PublicKeyUint8 = new Uint8Array(keygen_2.public_key);
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKeyUint8).toString(
      "hex",
    );

    const ed25519PublicKeyRes = Bytes.fromUint8Array(ed25519PublicKeyUint8, 32);
    if (ed25519PublicKeyRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `ed25519 publicKeyRes error: ${ed25519PublicKeyRes.err}`,
      };
    }
    const ed25519PublicKeyBytes = ed25519PublicKeyRes.data;

    const walletByPublicKeyRes = await getWalletByPublicKey(
      db,
      Buffer.from(ed25519PublicKeyBytes.toUint8Array()),
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
        msg: `Duplicate public key: ${ed25519PublicKeyHex}`,
      };
    }

    // Check keyshare from KS nodes for ed25519
    const getActiveKSNodesRes = await getActiveKSNodes(db);
    if (getActiveKSNodesRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getActiveKSNodes error: ${getActiveKSNodesRes.err}`,
      };
    }
    const activeKSNodes = getActiveKSNodesRes.data;

    const checkKeyshareV2Res = await checkKeyShareFromKSNodesV2(
      user_identifier,
      {
        ed25519: ed25519PublicKeyBytes,
      },
      activeKSNodes,
      auth_type,
    );
    if (checkKeyshareV2Res.success === false) {
      return checkKeyshareV2Res;
    }

    const ed25519KsNodeIds: string[] =
      checkKeyshareV2Res.data.ed25519?.nodeIds ?? [];
    if (ed25519KsNodeIds.length === 0) {
      return {
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: `no active ks nodes for ed25519`,
      };
    }
    const ksNodeIds = ed25519KsNodeIds;

    // Extract signing_share and verifying_share from key_package
    const ed25519KeyPackageShares = extractKeyPackageSharesEd25519(
      new Uint8Array(keygen_2.key_package),
    );

    // Store only signing_share and verifying_share (64 bytes total)
    const sharesData = {
      signing_share: ed25519KeyPackageShares.signing_share,
      verifying_share: ed25519KeyPackageShares.verifying_share,
    };

    const encryptedShare = await encryptDataAsync(
      JSON.stringify(sharesData),
      encryptionSecret,
    );
    const encryptedShareBuffer = Buffer.from(encryptedShare, "utf-8");
    const serverVerifyingShareEd25519Hex = Buffer.from(
      ed25519KeyPackageShares.verifying_share,
    ).toString("hex");

    const getKeyshareNodeMetaRes = await getKeyShareNodeMeta(db);
    if (getKeyshareNodeMetaRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getKeyShareNodeMeta error: ${getKeyshareNodeMetaRes.err}`,
      };
    }
    const globalSSSThreshold = getKeyshareNodeMetaRes.data.sss_threshold;

    let ed25519Wallet: Wallet;
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const createWalletRes = await createWallet(client, {
        user_id: user.user_id,
        curve_type: "ed25519",
        public_key: Buffer.from(ed25519PublicKeyBytes.toUint8Array()),
        enc_tss_share: encryptedShareBuffer,
        sss_threshold: globalSSSThreshold,
        status: "ACTIVE" as WalletStatus,
      });
      if (createWalletRes.success === false) {
        throw new Error(`createWallet error: ${createWalletRes.err}`);
      }
      ed25519Wallet = createWalletRes.data;

      if (ksNodeIds.length > 0) {
        const createWalletKSNodesRes = await createWalletKSNodes(
          client,
          ed25519Wallet.wallet_id,
          ksNodeIds,
        );
        if (createWalletKSNodesRes.success === false) {
          throw new Error(
            `createWalletKSNodes error: ${createWalletKSNodesRes.err}`,
          );
        }
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

    const secp256k1WalletId = secp256k1Wallet.wallet_id;

    const tokenResult = generateUserTokenV2({
      wallet_id_secp256k1: secp256k1WalletId,
      wallet_id_ed25519: ed25519Wallet.wallet_id,
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
          wallet_id_secp256k1: secp256k1Wallet.wallet_id,
          wallet_id_ed25519: ed25519Wallet.wallet_id,
          public_key_secp256k1: secp256k1Wallet.public_key.toString("hex"),
          public_key_ed25519: ed25519PublicKeyHex,
          server_verifying_share_ed25519: serverVerifyingShareEd25519Hex,
          user_identifier,
          email: email ?? null,
          name: name ?? null,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runKeygenEd25519 error: ${error}`,
    };
  }
}
