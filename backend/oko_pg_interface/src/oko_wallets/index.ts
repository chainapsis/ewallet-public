import { Pool, type PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import type { Result } from "@oko-wallet/stdlib-js";
import {
  type WalletStatus,
  type CreateWalletRequest,
  type Wallet,
  type WalletWithEmail,
  type WalletWithEmailAndKSNodes,
  type UserWithWallets,
} from "@oko-wallet/oko-types/wallets";
import type { CurveType } from "@oko-wallet/oko-types/crypto";

export async function createWallet(
  db: Pool | PoolClient,
  walletData: CreateWalletRequest,
): Promise<Result<Wallet, string>> {
  try {
    const createWalletQuery = `
INSERT INTO oko_wallets (
  wallet_id, user_id, curve_type, 
  public_key, enc_tss_share, sss_threshold, status
)
VALUES (
  $1, $2, $3, 
  $4, $5, $6, $7
)
RETURNING *
`;

    const values = [
      uuidv4(),
      walletData.user_id,
      walletData.curve_type,
      walletData.public_key,
      walletData.enc_tss_share,
      walletData.sss_threshold,
      walletData.status,
    ];

    const result = await db.query(createWalletQuery, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to create wallet",
      };
    }

    return {
      success: true,
      data: row as Wallet,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getWalletById(
  db: Pool | PoolClient,
  walletId: string,
): Promise<Result<Wallet | null, string>> {
  try {
    const query = `
SELECT * 
FROM oko_wallets 
WHERE wallet_id = $1 LIMIT 1
`;

    const result = await db.query(query, [walletId]);

    let wallet: Wallet | null = null;
    if (result.rows.length > 0) {
      wallet = result.rows[0] as Wallet;
    }

    return {
      success: true,
      data: wallet,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getWalletByIdWithEmail(
  db: Pool | PoolClient,
  walletId: string,
): Promise<Result<WalletWithEmail | null, string>> {
  try {
    const query = `
SELECT w.*, u.email AS email 
FROM oko_wallets w
LEFT JOIN oko_users u ON w.user_id = u.user_id
WHERE w.wallet_id = $1
LIMIT 1
`;

    const result = await db.query(query, [walletId]);

    let wallet: WalletWithEmail | null = null;
    if (result.rows.length > 0) {
      wallet = result.rows[0] as WalletWithEmail;
    }

    return {
      success: true,
      data: wallet,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getWalletByPublicKey(
  db: Pool | PoolClient,
  publicKey: Buffer,
): Promise<Result<Wallet | null, string>> {
  try {
    const query = `
SELECT * 
FROM oko_wallets 
WHERE public_key = $1 
LIMIT 1
`;

    const result = await db.query(query, [publicKey]);

    let wallet: Wallet | null = null;
    if (result.rows.length > 0) {
      wallet = result.rows[0] as Wallet;
    }

    return {
      success: true,
      data: wallet,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getActiveWalletByUserIdAndCurveType(
  db: Pool | PoolClient,
  userId: string,
  curveType: CurveType,
): Promise<Result<Wallet | null, string>> {
  try {
    const query = `
SELECT * 
FROM oko_wallets 
WHERE user_id = $1 
  AND curve_type = $2 
  AND status = $3
LIMIT 1
`;

    const result = await db.query(query, [
      userId,
      curveType,
      "ACTIVE" as WalletStatus,
    ]);

    let wallet: Wallet | null = null;
    if (result.rows.length > 0) {
      wallet = result.rows[0] as Wallet;
    }

    return {
      success: true,
      data: wallet,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getAllWallets(
  db: Pool | PoolClient,
  limit: number,
  offset: number,
): Promise<Result<WalletWithEmailAndKSNodes[], string>> {
  try {
    const query = `
SELECT
  w.*,
  u.email AS email,
  u.auth_type AS auth_type,
  COALESCE(
    JSON_AGG(wk.node_id) FILTER (WHERE wk.wallet_ks_node_id IS NOT NULL),
    '[]'::json
  ) as wallet_ks_nodes
FROM oko_wallets w
LEFT JOIN oko_users u ON w.user_id = u.user_id
LEFT JOIN wallet_ks_nodes wk ON w.wallet_id = wk.wallet_id
GROUP BY w.wallet_id, w.user_id, w.curve_type, w.public_key, w.status, w.enc_tss_share, w.metadata, w.created_at, w.updated_at, u.email, u.auth_type
ORDER BY w.created_at DESC
LIMIT $1
OFFSET $2
`;

    const result = await db.query(query, [limit, offset]);

    return {
      success: true,
      data: result.rows as WalletWithEmailAndKSNodes[],
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getWalletsCount(
  db: Pool | PoolClient,
): Promise<Result<number, string>> {
  try {
    const query = `
SELECT COUNT(*) FROM oko_wallets
`;

    const result = await db.query(query);

    return {
      success: true,
      data: parseInt(result.rows[0].count),
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateWalletStatus(
  db: Pool | PoolClient,
  walletId: string,
  status: WalletStatus,
): Promise<Result<void, string>> {
  try {
    const query = `
UPDATE oko_wallets
SET status = $1, updated_at = now()
WHERE wallet_id = $2
`;

    const result = await db.query(query, [status, walletId]);

    if (!result.rowCount || result.rowCount === 0) {
      return {
        success: false,
        err: "Failed to update wallet status",
      };
    }

    return {
      success: true,
      data: void 0,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getAllUsersWithWallets(
  db: Pool | PoolClient,
  limit: number,
  offset: number,
): Promise<Result<UserWithWallets[], string>> {
  try {
    const query = `
SELECT
  u.user_id,
  u.email,
  u.auth_type,
  w_secp.public_key AS secp256k1_public_key,
  w_secp.wallet_id AS secp256k1_wallet_id,
  COALESCE(secp_nodes.nodes, '[]'::json) AS secp256k1_ks_nodes,
  w_ed.public_key AS ed25519_public_key,
  w_ed.wallet_id AS ed25519_wallet_id,
  COALESCE(ed_nodes.nodes, '[]'::json) AS ed25519_ks_nodes
FROM oko_users u
LEFT JOIN LATERAL (
  SELECT * FROM oko_wallets w
  WHERE w.user_id = u.user_id AND w.curve_type = 'secp256k1' AND w.status = 'ACTIVE'
  ORDER BY w.created_at DESC
  LIMIT 1
) w_secp ON true
LEFT JOIN LATERAL (
  SELECT * FROM oko_wallets w
  WHERE w.user_id = u.user_id AND w.curve_type = 'ed25519' AND w.status = 'ACTIVE'
  ORDER BY w.created_at DESC
  LIMIT 1
) w_ed ON true
LEFT JOIN LATERAL (
  SELECT JSON_AGG(wk.node_id) AS nodes FROM wallet_ks_nodes wk WHERE wk.wallet_id = w_secp.wallet_id
) secp_nodes ON true
LEFT JOIN LATERAL (
  SELECT JSON_AGG(wk.node_id) AS nodes FROM wallet_ks_nodes wk WHERE wk.wallet_id = w_ed.wallet_id
) ed_nodes ON true
WHERE w_secp.wallet_id IS NOT NULL OR w_ed.wallet_id IS NOT NULL
ORDER BY u.created_at DESC
LIMIT $1
OFFSET $2
`;

    const result = await db.query(query, [limit, offset]);

    return {
      success: true,
      data: result.rows as UserWithWallets[],
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getUsersWithWalletsCount(
  db: Pool | PoolClient,
): Promise<Result<number, string>> {
  try {
    const query = `
SELECT COUNT(DISTINCT u.user_id)
FROM oko_users u
LEFT JOIN oko_wallets w_secp ON u.user_id = w_secp.user_id AND w_secp.curve_type = 'secp256k1' AND w_secp.status = 'ACTIVE'
LEFT JOIN oko_wallets w_ed ON u.user_id = w_ed.user_id AND w_ed.curve_type = 'ed25519' AND w_ed.status = 'ACTIVE'
WHERE w_secp.wallet_id IS NOT NULL OR w_ed.wallet_id IS NOT NULL
`;

    const result = await db.query(query);

    return {
      success: true,
      data: parseInt(result.rows[0].count),
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
