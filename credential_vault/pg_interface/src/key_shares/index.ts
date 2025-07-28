import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import type {
  CreateCredentialVaultKeyShareRequest,
  CredentialVaultKeyShare,
} from "@keplr-ewallet/credential-vault-interface";

import type { Result } from "@keplr-ewallet-credential-vault-pg-interface/utils";

export async function createKeyShare(
  db: Pool,
  keyShareData: CreateCredentialVaultKeyShareRequest,
): Promise<Result<CredentialVaultKeyShare, string>> {
  try {
    const query = `
    INSERT INTO key_shares (
      share_id, wallet_id, enc_share
    )
    VALUES (
      $1, $2, $3
    )
    RETURNING *
    `;

    const values = [uuidv4(), keyShareData.wallet_id, keyShareData.enc_share];

    const result = await db.query(query, values);

    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Failed to create key share" };
    }

    return { success: true, data: row as CredentialVaultKeyShare };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getKeyShareByShareId(
  db: Pool,
  shareId: string,
): Promise<Result<CredentialVaultKeyShare | null, string>> {
  try {
    const query = `SELECT * FROM key_shares WHERE share_id = $1 LIMIT 1`;
    const result = await db.query(query, [shareId]);

    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: row as CredentialVaultKeyShare };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getKeyShareByWalletId(
  db: Pool,
  walletId: string,
): Promise<Result<CredentialVaultKeyShare | null, string>> {
  try {
    const query = `SELECT * FROM key_shares WHERE wallet_id = $1 LIMIT 1`;
    const result = await db.query(query, [walletId]);

    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: row as CredentialVaultKeyShare };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
