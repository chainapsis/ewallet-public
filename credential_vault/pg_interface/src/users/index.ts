import { Pool } from "pg";
import type { CredentialVaultUser } from "@keplr-ewallet/credential-vault-interface";
import type { Result } from "@keplr-ewallet/stdlib-js";

export async function createUser(
  db: Pool,
  email: string,
): Promise<Result<CredentialVaultUser, string>> {
  try {
    const query = `
    INSERT INTO users (email) VALUES ($1) RETURNING *
    `;

    const values = [email];

    const result = await db.query(query, values);

    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Failed to create user" };
    }

    return { success: true, data: row as CredentialVaultUser };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getUserByEmail(
  db: Pool,
  email: string,
): Promise<Result<CredentialVaultUser | null, string>> {
  try {
    const query = `SELECT * FROM users WHERE email = $1 LIMIT 1`;
    const result = await db.query(query, [email]);

    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: row as CredentialVaultUser };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getUserFromUserId(
  db: Pool,
  user_id: string,
): Promise<Result<CredentialVaultUser, string>> {
  try {
    const query = `SELECT * FROM users WHERE user_id = $1 LIMIT 1`;
    const result = await db.query(query, [user_id]);

    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "User not found" };
    }

    return { success: true, data: row as CredentialVaultUser };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
