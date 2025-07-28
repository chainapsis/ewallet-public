import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Pool, type PoolConfig } from "pg";

import { dropAllTablesIfExist } from "@keplr-ewallet-credential-vault-pg-interface/postgres";

const DEFAULT_DB_NAME = "credential_vault_dev";

const MIGRATE_MODE = process.env.MIGRATE_MODE || "all"; // "all" or "one"
const COMMITTEE_ID = parseInt(process.env.COMMITTEE_ID || "1", 10) || 1;
const COMMITTEE_COUNT = parseInt(process.env.COMMITTEE_COUNT || "2", 10) || 2;

function readMigrateSql() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(currentDir, "./migrate.sql"), "utf-8");
  return sql;
}

async function createDBIfNotExists(committeeId: number) {
  const dbName =
    committeeId === 1 ? DEFAULT_DB_NAME : `${DEFAULT_DB_NAME}${committeeId}`;
  console.info(`Creating database ${dbName} if not exists...`);

  const testPgConfigPostgres = {
    database: "postgres",
    user: "postgres",
    password: "postgres",
    host: "localhost",
    port: 5432,
    ssl: false,
  };

  console.info("Connecting to db (postgres), config: %j", testPgConfigPostgres);
  const connRet = await createDBConn(testPgConfigPostgres);
  if (connRet.success === true) {
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
  } else {
    throw new Error("Cannot connect to postgres");
  }
}

async function createTables(pool: Pool): Promise<void> {
  const sql = readMigrateSql();
  const results = await pool.query(sql);

  console.log("Created tables, query count: %s", (results as any).length);
}

async function createDBConn(config: PoolConfig) {
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

async function migrateAll() {
  console.log("connecting pg...");

  for (let i = 1; i <= COMMITTEE_COUNT; i++) {
    await Promise.all([createDBIfNotExists(i)]);
  }

  for (let i = 1; i <= COMMITTEE_COUNT; i++) {
    const dbName = i === 1 ? DEFAULT_DB_NAME : `${DEFAULT_DB_NAME}${i}`;

    const testPgConfigCredentialVaultDev = {
      database: dbName,
      user: "postgres",
      password: "postgres",
      host: "localhost",
      port: 5432,
      ssl: false,
    };

    console.info(
      `Connecting to db (${dbName}), config: %j`,
      testPgConfigCredentialVaultDev,
    );
    const connRet = await createDBConn(testPgConfigCredentialVaultDev);
    if (connRet.success === true) {
      const pool = connRet.data;

      await dropAllTablesIfExist(pool);
      await createTables(pool);
    }
  }
}

async function migrateOne() {
  await createDBIfNotExists(COMMITTEE_ID);

  const dbName =
    COMMITTEE_ID === 1 ? DEFAULT_DB_NAME : `${DEFAULT_DB_NAME}${COMMITTEE_ID}`;

  const testPgConfigCredentialVaultDev = {
    database: dbName,
    user: "postgres",
    password: "postgres",
    host: "localhost",
    port: 5432,
    ssl: false,
  };

  console.info(
    "Connecting to db (credential_vault_dev), config: %j",
    testPgConfigCredentialVaultDev,
  );
  const connRet = await createDBConn(testPgConfigCredentialVaultDev);
  if (connRet.success === true) {
    const pool = connRet.data;

    await dropAllTablesIfExist(pool);
    await createTables(pool);
  }
}

if (MIGRATE_MODE === "all") {
  migrateAll().then();
} else if (MIGRATE_MODE === "one") {
  migrateOne().then();
} else {
  throw new Error(`Invalid migrate mode: ${MIGRATE_MODE}`);
}
