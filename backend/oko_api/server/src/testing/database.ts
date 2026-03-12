import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

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

      console.log("Truncate table: %s", tbl);
      const res = await truncateTable(client, tbl);

      if (res.success === false) {
        throw new Error(res.err);
      }
    }
    await client.query("COMMIT");

    console.log("Truncated tables in pg");
  } catch (err) {
    console.error("Error truncating table, err: %s", err);

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
  truncate ${table} cascade
  `,
      [],
    );

    return { success: true, data: void 0 };
  } catch (err: unknown) {
    return { success: false, err: err as any };
  }
}
