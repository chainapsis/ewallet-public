import type { Result } from "@oko-wallet/stdlib-js";
import { Pool } from "pg";

export type PgDatabaseConfig = {
  database: string;
  host: string;
  password: string;
  user: string;
  port: number;
  ssl: boolean;
};

export async function createPgDatabase(
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
    console.info(
      "Connecting to PostgreSQL... host: %s, database: %s",
      config.host,
      config.database,
    );

    const pool = new Pool(resolvedConfig);

    const { rows: result } = await pool.query("SELECT NOW()");
    console.info("Connected to PostgreSQL, server time: %s", result[0].now);

    return { success: true, data: pool };
  } catch (error) {
    console.error("Failed to connect to PostgreSQL: %s", error);
    return {
      success: false,
      err: `Failed to connect to PostgreSQL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
