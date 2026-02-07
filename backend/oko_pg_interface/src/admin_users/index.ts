import type { OkoAdminUser } from "@oko-wallet/oko-types/admin";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

export async function createAdmin(
  db: Pool | PoolClient,
  adminUser: OkoAdminUser,
): Promise<Result<string, string>> {
  const query = `
INSERT INTO admin_users (
  user_id, email, password_hash, 
  role, is_active
)
VALUES (
  $1, $2, $3, 
  $4, $5
)
RETURNING user_id
`;

  const values = [
    adminUser.user_id,
    adminUser.email,
    adminUser.password_hash,
    adminUser.role || "admin",
    adminUser.is_active !== undefined ? adminUser.is_active : true,
  ];

  try {
    const result = await db.query<OkoAdminUser>(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: `Failed to create admin user`,
      };
    }

    return { success: true, data: row.user_id };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getAdminByEmail(
  db: Pool,
  email: string,
): Promise<Result<OkoAdminUser | null, string>> {
  const query = `
SELECT * 
FROM admin_users
WHERE email = $1 AND is_active = true
LIMIT 1
`;

  try {
    const result = await db.query<OkoAdminUser>(query, [email]);
    return {
      success: true,
      data: result.rows.length > 0 ? result.rows[0] : null,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getAdminById(
  db: Pool,
  adminId: string,
): Promise<Result<OkoAdminUser | null, string>> {
  const query = `
SELECT * 
FROM admin_users
WHERE user_id = $1 AND is_active = true
LIMIT 1
`;

  try {
    const result = await db.query<OkoAdminUser>(query, [adminId]);
    return {
      success: true,
      data: result.rows.length > 0 ? result.rows[0] : null,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateAdminPassword(
  db: Pool,
  adminId: string,
  newPasswordHash: string,
): Promise<Result<void, string>> {
  const query = `
UPDATE admin_users 
SET password_hash = $1, updated_at = now()
WHERE user_id = $2 AND is_active = true
`;

  try {
    await db.query(query, [newPasswordHash, adminId]);

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

export async function updateAdminStatus(
  db: Pool,
  adminId: string,
  isActive: boolean,
): Promise<Result<void, string>> {
  const query = `
UPDATE admin_users
SET is_active = $1, updated_at = now()
WHERE user_id = $2
`;

  try {
    await db.query(query, [isActive, adminId]);

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
