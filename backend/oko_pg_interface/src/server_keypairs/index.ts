import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface ServerKeypair {
  keypair_id: string;
  version: number;
  public_key: Buffer;
  enc_private_key: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  rotated_at: Date | null;
}

export async function getActiveServerKeypair(
  db: Pool | PoolClient,
): Promise<Result<ServerKeypair | null, string>> {
  const query = `
SELECT *
FROM server_keypairs
WHERE is_active = true
ORDER BY version DESC
LIMIT 1
`;

  try {
    const result = await db.query<ServerKeypair>(query);

    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
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

export async function getServerKeypairByVersion(
  db: Pool | PoolClient,
  version: number,
): Promise<Result<ServerKeypair | null, string>> {
  const query = `
SELECT *
FROM server_keypairs
WHERE version = $1
LIMIT 1
`;

  try {
    const result = await db.query<ServerKeypair>(query, [version]);

    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
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

export async function getAllServerKeypairs(
  db: Pool | PoolClient,
): Promise<Result<ServerKeypair[], string>> {
  const query = `
SELECT *
FROM server_keypairs
ORDER BY version DESC
`;

  try {
    const result = await db.query<ServerKeypair>(query);

    return {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function insertServerKeypair(
  db: Pool | PoolClient,
  params: {
    public_key: Buffer;
    enc_private_key: string;
  },
): Promise<Result<ServerKeypair, string>> {
  const query = `
INSERT INTO server_keypairs (
  keypair_id, public_key, enc_private_key, is_active
)
VALUES (
  $1, $2, $3, true
)
RETURNING *
`;

  const values = [uuidv4(), params.public_key, params.enc_private_key];

  try {
    const result = await db.query<ServerKeypair>(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to create server keypair",
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

export async function rotateServerKeypair(
  db: Pool | PoolClient,
  params: {
    public_key: Buffer;
    enc_private_key: string;
  },
): Promise<Result<ServerKeypair, string>> {
  const client =
    "query" in db && "release" in db ? db : await (db as Pool).connect();
  const isPoolClient = client !== db;

  try {
    if (isPoolClient) {
      await client.query("BEGIN");
    }

    // Deactivate all existing keypairs
    await client.query(`
UPDATE server_keypairs
SET is_active = false, rotated_at = now(), updated_at = now()
WHERE is_active = true
`);

    // Insert new keypair (version is auto-incremented)
    const insertRes = await insertServerKeypair(client, {
      public_key: params.public_key,
      enc_private_key: params.enc_private_key,
    });

    if (!insertRes.success) {
      throw new Error(insertRes.err);
    }

    if (isPoolClient) {
      await client.query("COMMIT");
    }

    return insertRes;
  } catch (error) {
    if (isPoolClient) {
      await client.query("ROLLBACK");
    }
    return {
      success: false,
      err: String(error),
    };
  } finally {
    if (isPoolClient) {
      (client as PoolClient).release();
    }
  }
}

export async function deactivateServerKeypair(
  db: Pool | PoolClient,
  keypairId: string,
): Promise<Result<void, string>> {
  const query = `
UPDATE server_keypairs
SET is_active = false, rotated_at = now(), updated_at = now()
WHERE keypair_id = $1
`;

  try {
    await db.query(query, [keypairId]);

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
