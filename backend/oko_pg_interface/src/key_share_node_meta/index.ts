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
  try {
    const insertKeyShareNodeMetaQuery = `
INSERT INTO key_share_node_meta (
  sss_threshold
) VALUES (
  $1
)
`;

    await db.query(insertKeyShareNodeMetaQuery, [
      keyShareNodeMetaData.sss_threshold,
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
