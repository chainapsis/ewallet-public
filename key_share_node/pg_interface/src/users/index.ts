import type { KSNodeUser } from "@oko-wallet/ksn-interface/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

export async function createUser(
  db: Pool | PoolClient,
  auth_type: AuthType,
  user_auth_id: string,
): Promise<Result<KSNodeUser, string>> {
  try {
    const query = `
INSERT INTO "2_users" (
  auth_type, user_auth_id
) 
VALUES (
  $1, $2
) 
RETURNING *
`;

    const values = [auth_type, user_auth_id];

    const result = await db.query(query, values);

    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Failed to create user" };
    }

    return { success: true, data: row as KSNodeUser };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getUserByAuthTypeAndUserAuthId(
  db: Pool | PoolClient,
  auth_type: AuthType,
  user_auth_id: string,
): Promise<Result<KSNodeUser | null, string>> {
  try {
    const query = `
SELECT * FROM "2_users" 
WHERE auth_type = $1 AND user_auth_id = $2
LIMIT 1
`;
    const result = await db.query(query, [auth_type, user_auth_id]);

    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: row as KSNodeUser };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getUserFromUserId(
  db: Pool | PoolClient,
  user_id: string,
): Promise<Result<KSNodeUser, string>> {
  try {
    const query = `
SELECT * FROM "2_users" 
WHERE user_id = $1 
LIMIT 1
`;
    const result = await db.query(query, [user_id]);

    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "User not found" };
    }

    return { success: true, data: row as KSNodeUser };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
