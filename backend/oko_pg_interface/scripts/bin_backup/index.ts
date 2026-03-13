import { loadEnv, verifyEnv } from "@oko-wallet/dotenv";
import {
  createPgConn,
  dropAllTablesIfExist,
  type PgDatabaseConfig,
} from "@oko-wallet/postgres-lib";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import type { Pool } from "pg";
import { fileURLToPath } from "url";

import { ENV_FILE_NAME, envSchema } from "../envs";

function readMigrateSql() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(currentDir, "./migrate.sql"), "utf-8");
  return sql;
}

async function createDBIfNotExists(pgConfig: PgDatabaseConfig, dbName: string) {
  console.info(`Creating databases if not exists...`);
  console.info(
    "Connecting to db (postgres), config: %j, dbName: %s",
    pgConfig,
    dbName,
  );
  const connRet = await createPgConn(pgConfig);
  if (!connRet.success) {
    throw new Error(`Failed to connect to db: ${connRet.err}`);
  }

  const pool = connRet.data;

  const res = await pool.query(
    `SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}'`,
  );
  if (res.rowCount === 0) {
    console.log(`${dbName} database not found, creating it.`);
    await pool.query(`CREATE DATABASE "${dbName}";`);
    console.log(`Created database ${dbName}`);
  } else {
    console.log(`${dbName} database exists.`);
  }

  await pool.end();
}

async function createTables(pool: Pool): Promise<void> {
  const sql = readMigrateSql();
  const results = await pool.query(sql);

  console.log("Created tables, query count: %s", (results as any).length);
}

async function main() {
  const useEnv = process.env.USE_ENV === "true";
  if (useEnv) {
    console.log("Using env file config, loading env file: %s", ENV_FILE_NAME);
    loadEnv(ENV_FILE_NAME);
    const envRes = verifyEnv(envSchema, process.env);
    if (!envRes.success) {
      throw new Error(`Env variable invalid: ${envRes.err}`);
    }
  } else {
    console.log("Using test config");
  }
  console.log("connecting pg...");

  const pgConfig: PgDatabaseConfig = {
    database: process.env.DB_NAME ?? "oko_dev",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    ssl: process.env.DB_SSL === "true",
  };

  await createDBIfNotExists(
    { ...pgConfig, database: "postgres" },
    pgConfig.database,
  );

  console.info(
    "Connecting to db (%s), config: %j",
    pgConfig.database,
    pgConfig,
  );
  const connRes = await createPgConn(pgConfig);
  if (!connRes.success) {
    throw new Error(connRes.err);
  }

  const pool = connRes.data;

  await dropAllTablesIfExist(pool);
  await createTables(pool);

  await pool.end();
}

main().then();
