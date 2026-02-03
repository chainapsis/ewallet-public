import type { Pool } from "pg";
import { createPgConn } from "@oko-wallet/postgres-lib";
import type { Result } from "@oko-wallet/stdlib-js";

export interface PgDatabaseConfig {
  database: string;
  host: string;
  password: string;
  user: string;
  port: number;
  ssl: boolean;
}

export const okoApiDbConfig: PgDatabaseConfig = {
  database: "oko_dev",
  host: "localhost",
  password: "postgres",
  user: "postgres",
  port: 5432,
  ssl: false,
};

export const createKsnDbConfig = (nodeId: number): PgDatabaseConfig => ({
  database: `key_share_node_dev${nodeId}`,
  host: "localhost",
  password: "postgres",
  user: "postgres",
  port: 5432,
  ssl: false,
});

export async function connectDatabase(
  config: PgDatabaseConfig,
): Promise<Result<Pool, string>> {
  return createPgConn({
    database: config.database,
    host: config.host,
    password: config.password,
    user: config.user,
    port: config.port,
    ssl: config.ssl,
  });
}

export async function resetDatabase(pool: Pool): Promise<void> {
  const tablesRes = await getAllTables(pool);
  if (!tablesRes.success) {
    throw new Error(`Failed to get tables: ${tablesRes.err}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of tablesRes.data) {
      await client.query(`TRUNCATE "${table}" CASCADE`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getAllTables(pool: Pool): Promise<Result<string[], string>> {
  try {
    const result = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`,
    );
    return { success: true, data: result.rows.map((r) => r.table_name) };
  } catch (err) {
    return { success: false, err: String(err) };
  }
}
