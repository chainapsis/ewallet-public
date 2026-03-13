import { devEnvSchema } from "./dev_envs";
import { loadEnvs } from "@oko-wallet-ksn-pg-interface/bin/db_aux/envs";
import {
  createDBConn,
  type PgDatabaseConfig,
} from "@oko-wallet-ksn-pg-interface/bin/db_aux/utils";
import {
  createTables,
  dropAllTablesIfExist,
} from "@oko-wallet-ksn-pg-interface/postgres";

const DEFAULT_DB_NAME = "key_share_node_dev";

async function createDBIfNotExists(pgConfig: PgDatabaseConfig, dbName: string) {
  console.log(`Creating database ${dbName} if not exists...`);

  console.log("Connecting to db (postgres), config: %j", pgConfig);
  const connRet = await createDBConn(pgConfig);
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

async function migrateAll(
  useEnvFile: boolean,
  nodeCount: number,
  dbName: string,
) {
  console.log("connecting pg...");

  const pgConfigs: PgDatabaseConfig[] = [];
  for (let i = 1; i <= nodeCount; i++) {
    if (useEnvFile) {
      pgConfigs.push(loadEnvs(i));
    } else {
      pgConfigs.push({
        database: i === 1 ? dbName : `${dbName}${i}`,
        user: "postgres",
        password: "postgres",
        host: "localhost",
        port: 5432,
        ssl: false,
      });
    }
  }

  for (const pgConfig of pgConfigs) {
    await createDBIfNotExists(
      { ...pgConfig, database: "postgres" },
      pgConfig.database,
    );
  }

  for (const pgConfig of pgConfigs) {
    console.log(
      `Connecting to db (${pgConfig.database}), config: %j`,
      pgConfig,
    );
    const connRet = await createDBConn(pgConfig);
    if (connRet.success === true) {
      const pool = connRet.data;

      console.log(`Dropping tables in db (${pgConfig.database})...`);
      await dropAllTablesIfExist(pool);
      await createTables(pool);
      await pool.end();
    }
  }
}

async function migrateOne(useEnv: boolean, nodeId: number) {
  const dbName = process.env.DB_NAME || DEFAULT_DB_NAME;

  const pgConfig: PgDatabaseConfig = useEnv
    ? loadEnvs(nodeId)
    : {
        database: nodeId === 1 ? dbName : `${dbName}${nodeId}`,
        user: "postgres",
        password: "postgres",
        host: "localhost",
        port: 5432,
        ssl: false,
      };

  await createDBIfNotExists(
    { ...pgConfig, database: "postgres" },
    pgConfig.database,
  );

  console.log(`Connecting to db (${pgConfig.database}), config: %j`, pgConfig);
  const connRet = await createDBConn(pgConfig);
  if (connRet.success === true) {
    const pool = connRet.data;

    console.log(`Dropping tables in db (${pgConfig.database})...`);
    await dropAllTablesIfExist(pool);

    await createTables(pool);
  }
}

async function main() {
  const devEnvs = {
    MIGRATE_MODE: process.env.MIGRATE_MODE,
    USE_ENV_FILE: process.env.USE_ENV_FILE,
    NODE_ID: process.env.NODE_ID,
    NODE_COUNT: process.env.NODE_COUNT,
    DB_NAME: process.env.DB_NAME,
  };

  const envs = devEnvSchema.parse(devEnvs);

  const migrateMode = envs.MIGRATE_MODE;
  const useEnvFile = envs.USE_ENV_FILE === "true";
  const dbName = devEnvs.DB_NAME || DEFAULT_DB_NAME;

  const nodeId = parseInt(envs.NODE_ID || "1", 10);
  const nodeCount = parseInt(envs.NODE_COUNT || "2", 10);

  switch (migrateMode) {
    case "all": {
      await migrateAll(useEnvFile, nodeCount, dbName);
      break;
    }
    case "one": {
      await migrateOne(useEnvFile, nodeId);
      break;
    }
    default: {
      throw new Error(`Invalid migrate mode: ${migrateMode}`);
    }
  }
}

main().then();
