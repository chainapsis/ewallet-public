import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

export type PgDatabaseConfig = {
  database: string;
  host: string;
  password: string;
  user: string;
  port: number;
  ssl: boolean;
};

export function readMigrateSql() {
  const currDir = dirname(fileURLToPath(import.meta.url));
  const migrateSqlPath = join(currDir, "../migrate/migrate.sql");

  const sql = readFileSync(migrateSqlPath, "utf-8");
  return sql;
}

export async function createDBConn(config: PgDatabaseConfig) {
  const resolvedConfig = {
    ...config,
    ssl: config.ssl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  };

  const pool = new Pool(resolvedConfig);

  return {
    success: true,
    data: pool,
  };
}
