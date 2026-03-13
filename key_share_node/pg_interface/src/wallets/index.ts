import type { Bytes32, Bytes33 } from "@oko-wallet/bytes";
import type {
  CreateKSNodeWalletRequest,
  KSNodeWallet,
} from "@oko-wallet/ksn-interface/wallet";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

export async function createWallet(
  db: Pool | PoolClient,
  createKSNodeWalletRequest: CreateKSNodeWalletRequest,
): Promise<Result<KSNodeWallet, string>> {
  try {
    const query = `
INSERT INTO "2_wallets" (
  wallet_id, user_id, curve_type, 
  public_key
)
VALUES (
  $1, $2, $3, 
  $4
)
RETURNING *
`;

    const values = [
      uuidv4(),
      createKSNodeWalletRequest.user_id,
      createKSNodeWalletRequest.curve_type,
      createKSNodeWalletRequest.public_key,
    ];

    const result = await db.query(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to create wallet",
      };
    }

    return {
      success: true,
      data: row as KSNodeWallet,
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
): Promise<Result<KSNodeWallet | null, string>> {
  try {
    const query = `
SELECT * FROM "2_wallets" 
WHERE wallet_id = $1 
LIMIT 1
`;

    const result = await db.query(query, [walletId]);

    let wallet: KSNodeWallet | null = null;
    if (result.rows.length > 0) {
      wallet = result.rows[0] as KSNodeWallet;
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
  publicKey: Bytes32 | Bytes33,
): Promise<Result<KSNodeWallet | null, string>> {
  try {
    const query = `
SELECT * FROM "2_wallets"
WHERE public_key = $1
LIMIT 1
`;

    const result = await db.query(query, [publicKey.toUint8Array()]);

    let wallet: KSNodeWallet | null = null;
    if (result.rows.length > 0) {
      wallet = result.rows[0] as KSNodeWallet;
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

export async function getWalletsByUserId(
  db: Pool | PoolClient,
  userId: string,
): Promise<Result<KSNodeWallet[], string>> {
  try {
    const query = `
SELECT * FROM "2_wallets"
WHERE user_id = $1
`;

    const result = await db.query(query, [userId]);

    return {
      success: true,
      data: result.rows as KSNodeWallet[],
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
