import {
  getAllWallets,
  getWalletsCount,
  getAllUsersWithWallets,
  getUsersWithWalletsCount,
} from "@oko-wallet/oko-pg-interface/oko_wallets";
import type {
  GetWalletListRequest,
  GetWalletListResponse,
  GetUserListRequest,
  GetUserListResponse,
} from "@oko-wallet/oko-types/admin";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Pool } from "pg";

export async function getWalletList(
  db: Pool,
  body: GetWalletListRequest,
): Promise<OkoApiResponse<GetWalletListResponse>> {
  try {
    let { limit, offset } = body;
    if (!limit || !offset) {
      limit = 10;
      offset = 0;
    } else {
      limit = Number(limit);
      offset = Number(offset);
    }

    const getAllWalletsRes = await getAllWallets(db, limit, offset);
    if (getAllWalletsRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get all wallets: ${getAllWalletsRes.err}`,
      };
    }

    const getWalletsCountRes = await getWalletsCount(db);
    if (getWalletsCountRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get wallets count: ${getWalletsCountRes.err}`,
      };
    }

    const total = getWalletsCountRes.data;
    const totalPages = Math.ceil(total / limit);
    const currentPage = total ? Math.floor(offset / limit) + 1 : 0;

    return {
      success: true,
      data: {
        wallets: getAllWalletsRes.data.map((wallet) => ({
          public_key: wallet.public_key.toString("hex"),
          email: wallet.email,
          auth_type: wallet.auth_type,
          wallet_id: wallet.wallet_id,
          wallet_ks_nodes: wallet.wallet_ks_nodes,
        })),
        pagination: {
          total,
          current_page: currentPage,
          total_pages: totalPages,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to get wallet list: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getUserList(
  db: Pool,
  body: GetUserListRequest,
): Promise<OkoApiResponse<GetUserListResponse>> {
  try {
    let { limit, offset } = body;
    if (!limit || !offset) {
      limit = 10;
      offset = 0;
    } else {
      limit = Number(limit);
      offset = Number(offset);
    }

    const getAllUsersRes = await getAllUsersWithWallets(db, limit, offset);
    if (getAllUsersRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get all users: ${getAllUsersRes.err}`,
      };
    }

    const getUsersCountRes = await getUsersWithWalletsCount(db);
    if (getUsersCountRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get users count: ${getUsersCountRes.err}`,
      };
    }

    const total = getUsersCountRes.data;
    const totalPages = Math.ceil(total / limit);
    const currentPage = total ? Math.floor(offset / limit) + 1 : 0;

    return {
      success: true,
      data: {
        users: getAllUsersRes.data.map((user) => ({
          user_id: user.user_id,
          auth_type: user.auth_type,
          email: user.email,
          secp256k1_public_key: user.secp256k1_public_key?.toString("hex") ?? null,
          secp256k1_wallet_id: user.secp256k1_wallet_id,
          secp256k1_ks_nodes: user.secp256k1_ks_nodes ?? [],
          ed25519_public_key: user.ed25519_public_key?.toString("hex") ?? null,
          ed25519_wallet_id: user.ed25519_wallet_id,
          ed25519_ks_nodes: user.ed25519_ks_nodes ?? [],
        })),
        pagination: {
          total,
          current_page: currentPage,
          total_pages: totalPages,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to get user list: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
