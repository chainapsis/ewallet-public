import type {
  InsertKeyShareNodeMetaRequest,
  KeyShareNodeMeta,
} from "@oko-wallet/oko-types/key_share_node_meta";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

export async function insertKeyShareNodeMeta(
  db: Pool | PoolClient,
  keyShareNodeMetaData: InsertKeyShareNodeMetaRequest,
): Promise<Result<void, string>> {
  if (
    keyShareNodeMetaData.registration_threshold != null &&
    keyShareNodeMetaData.registration_threshold <
      keyShareNodeMetaData.sss_threshold
  ) {
    return {
      success: false,
      err: "registration_threshold must be >= sss_threshold",
    };
  }

  try {
    const insertKeyShareNodeMetaQuery = `
INSERT INTO key_share_node_meta (
  sss_threshold,
  registration_threshold
) VALUES (
  $1,
  $2
)
`;

    await db.query(insertKeyShareNodeMetaQuery, [
      keyShareNodeMetaData.sss_threshold,
      keyShareNodeMetaData.registration_threshold ?? null,
    ]);

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

export async function getKeyShareNodeMeta(
  db: Pool | PoolClient,
): Promise<Result<KeyShareNodeMeta, string>> {
  try {
    const getKeyShareNodeMetaQuery = `
SELECT * FROM key_share_node_meta 
ORDER BY created_at DESC 
LIMIT 1
`;

    const getKeyShareNodeMetaResult = await db.query(getKeyShareNodeMetaQuery);

    if (getKeyShareNodeMetaResult.rows.length === 0) {
      return {
        success: false,
        err: "Failed to get key share node meta",
      };
    }

    return {
      success: true,
      data: getKeyShareNodeMetaResult.rows[0],
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateRegistrationThreshold(
  db: Pool | PoolClient,
  registrationThreshold: number | null,
): Promise<Result<KeyShareNodeMeta, string>> {
  try {
    // Get current meta to validate against sss_threshold
    const getRes = await getKeyShareNodeMeta(db);
    if (!getRes.success) {
      return { success: false, err: getRes.err };
    }

    if (
      registrationThreshold != null &&
      registrationThreshold < getRes.data.sss_threshold
    ) {
      return {
        success: false,
        err: "registration_threshold must be >= sss_threshold",
      };
    }

    const updateQuery = `
UPDATE key_share_node_meta
SET registration_threshold = $1, updated_at = NOW()
WHERE meta_id = (
  SELECT meta_id FROM key_share_node_meta
  ORDER BY created_at DESC LIMIT 1
)
RETURNING *
`;

    const result = await db.query(updateQuery, [registrationThreshold]);

    if (result.rows.length === 0) {
      return {
        success: false,
        err: "Failed to update key share node meta",
      };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
