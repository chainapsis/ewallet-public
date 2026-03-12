import type { Result } from "@oko-wallet/stdlib-js";
import { Pool, type PoolClient } from "pg";

import { logger } from "@oko-wallet-ksn-server/logger";

export type PgDatabaseConfig = {
  database: string;
  host: string;
  password: string;
  user: string;
  port: number;
  ssl: boolean;
};

export async function connectPG(
  config: PgDatabaseConfig,
): Promise<Result<Pool, string>> {
  const resolvedConfig = {
    ...config,
    ssl: config.ssl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  };

  try {
    logger.debug(
      "Connecting to PostgreSQL, host: %s, database: %s",
      config.host,
      config.database,
    );

    const pool = new Pool(resolvedConfig);

    // Test connection
    const { rows: result } = await pool.query("SELECT NOW()");

    logger.info("Connected to PostgreSQL, server time: %o", result);

    return { success: true, data: pool };
  } catch (error) {
    logger.error("Failed to connect to PostgreSQL: %s", error);

    return {
      success: false,
      err: `Failed to connect to PostgreSQL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export async function resetPgDatabase(pool: Pool) {
  const getAllTablesRes = await getAllTables(pool);
  if (getAllTablesRes.success === false) {
    throw new Error("get table fail");
  }

  const { data: tables } = getAllTablesRes;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let idx = 0; idx < tables.length; idx += 1) {
      const tbl = tables[idx];

      logger.debug("Truncate table: %s", tbl);
      const res = await truncateTable(client, tbl);

      if (res.success === false) {
        throw new Error(res.err);
      }
    }
    await client.query("COMMIT");

    logger.debug("Truncated tables in pg");
  } catch (err) {
    logger.error("Error truncating table, err: %s", err);

    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

export async function getAllTables(
  pool: Pool,
): Promise<Result<string[], string>> {
  try {
    const ret = await pool.query<{ table_name: string }>(
      `
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_type='BASE TABLE'
`,
      [],
    );

    return { success: true, data: ret.rows?.map((r) => r.table_name) ?? [] };
  } catch (err) {
    return { success: false, err: err as any };
  }
}

export async function truncateTable(
  pool: Pool | PoolClient,
  table: string,
): Promise<Result<void, string>> {
  try {
    await pool.query(
      `
truncate "${table}"
`,
      [],
    );

    return { success: true, data: void 0 };
  } catch (err: unknown) {
    return { success: false, err: err as any };
  }
}
