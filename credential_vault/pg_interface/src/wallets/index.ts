import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import type {
  CredentialVaultWallet,
  CreateCredentialVaultWalletRequest,
} from "@keplr-ewallet/credential-vault-interface";

import type { Result } from "@keplr-ewallet-credential-vault-pg-interface/utils";

export async function createWallet(
  db: Pool,
  createCredentialVaultWalletRequest: CreateCredentialVaultWalletRequest,
): Promise<Result<CredentialVaultWallet, string>> {
  try {
    const query = `
    INSERT INTO wallets (
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
      createCredentialVaultWalletRequest.user_id,
      createCredentialVaultWalletRequest.curve_type,
      createCredentialVaultWalletRequest.public_key,
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
      data: row as CredentialVaultWallet,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getWalletById(
  db: Pool,
  walletId: string,
): Promise<Result<CredentialVaultWallet | null, string>> {
  try {
    const query = `
    SELECT * FROM wallets WHERE wallet_id = $1 LIMIT 1
    `;

    const result = await db.query(query, [walletId]);

    let wallet: CredentialVaultWallet | null = null;
    if (result.rows.length > 0) {
      wallet = result.rows[0] as CredentialVaultWallet;
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
  db: Pool,
  publicKey: Buffer,
): Promise<Result<CredentialVaultWallet | null, string>> {
  try {
    const query = `
    SELECT * FROM wallets WHERE public_key = $1 LIMIT 1
    `;

    const result = await db.query(query, [publicKey]);

    let wallet: CredentialVaultWallet | null = null;
    if (result.rows.length > 0) {
      wallet = result.rows[0] as CredentialVaultWallet;
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
