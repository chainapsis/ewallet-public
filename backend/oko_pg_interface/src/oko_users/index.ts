import type { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import type { Result } from "@oko-wallet/stdlib-js";
import type { User } from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";

export async function createUser(
  db: Pool,
  email: string,
  auth_type: AuthType,
  metadata?: Record<string, unknown>,
): Promise<Result<User, string>> {
  try {
    const query = `
INSERT INTO oko_users (
  user_id, email, auth_type, metadata
) VALUES (
  $1, $2, $3, $4
)
RETURNING *
`;
    const values = [uuidv4(), email, auth_type, metadata ? JSON.stringify(metadata) : null];

    const result = await db.query<User>(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to create user",
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getUserByEmailAndAuthType(
  db: Pool | PoolClient,
  email: string,
  auth_type: AuthType,
): Promise<Result<User | null, string>> {
  try {
    const query = `
SELECT *
FROM oko_users
WHERE email = $1 AND auth_type = $2
LIMIT 1
`;

    const result = await db.query(query, [email, auth_type]);

    let user: User | null = null;
    if (result.rows.length > 0) {
      user = result.rows[0] as User;
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateUserMetadata(
  db: Pool | PoolClient,
  userId: string,
  metadata: Record<string, unknown>,
): Promise<Result<User, string>> {
  try {
    const query = `
UPDATE oko_users
SET metadata = $2, updated_at = NOW()
WHERE user_id = $1
RETURNING *
`;

    const result = await db.query<User>(query, [userId, JSON.stringify(metadata)]);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "User not found",
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
