import knexConfig from "@oko-wallet/ksn-pg-interface/knexfile";
import chalk from "chalk";
import dayjs from "dayjs";
import knex from "knex";

import { checkDBBackup } from "./check_db_backup";
import { parseCLIArgs } from "./cli_args";
import { getGitCommitHash } from "./git";
import { initializeServerKeypair } from "./init_keypair";
import { loadEncSecret } from "./load_enc_secret";
import pJson from "@oko-wallet-ksn-server/../package.json";
import { makeApp } from "@oko-wallet-ksn-server/app";
import { connectPG } from "@oko-wallet-ksn-server/database";
import { loadEnv, verifyEnv } from "@oko-wallet-ksn-server/envs";
import { logger } from "@oko-wallet-ksn-server/logger";
import { startPgDumpRuntime } from "@oko-wallet-ksn-server/pg_dump/runtime";
import { startTelemetryReporterRuntime } from "@oko-wallet-ksn-server/runtime/telemetry_reporter";
import type { ServerState } from "@oko-wallet-ksn-server/state";

const ONE_DAY_MS = 1 * 86400;

async function main() {
  const opts = parseCLIArgs();
  logger.info("Launching ks node server, cli args: %j", opts);
  logger.info("Launching, Logger initialized");

  loadEnv(opts.nodeId);

  const verifyEnvRes = verifyEnv(process.env);
  if (!verifyEnvRes.success) {
    logger.error("ENV variables invalid, err: %s", verifyEnvRes.err);

    process.exit(1);
  }

  const loadEncSecretRes = loadEncSecret(process.env.ENCRYPTION_SECRET_PATH);
  if (!loadEncSecretRes.success) {
    logger.error("Encryption secret invalid, err: %s", loadEncSecretRes.err);

    process.exit(1);
  }

  if (opts.nodeId === "1") {
    logger.debug("Checking DB backup, nodeId: %s", opts.nodeId);

    const backupRes = await checkDBBackup(
      {
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        user: process.env.DB_USER,
        port: Number(process.env.DB_PORT),
        ssl: process.env.DB_SSL === "true",
      },
      process.env.DUMP_DIR,
    );
    if (!backupRes.success) {
      logger.error(
        "%s: Health check failed, exiting process, err: %s",
        chalk.bold.red("Error"),
        backupRes.err,
      );

      process.exit(1);
    } else {
      logger.info("Finished DB backup check");
    }
  } else {
    logger.info("Bypass DB backup checking, nodeId: %s", opts.nodeId);
  }

  logger.info("Running database migrations...");
  try {
    const migrationConfig = {
      client: "pg",
      connection: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl:
          process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      },
      migrations: knexConfig.migrations,
    };
    const knexInstance = knex(migrationConfig);
    await knexInstance.migrate.latest();
    await knexInstance.destroy();
    logger.info("Database migrations completed successfully");
  } catch (err) {
    logger.error("Migration failed, err: %s", err);
    process.exit(1);
  }

  const app = makeApp();

  const git_hash = getGitCommitHash();
  const version = pJson.version;

  const now = dayjs();
  const launch_time = now.toISOString();

  const createPostgresRes = await connectPG({
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    port: Number(process.env.DB_PORT),
    ssl: process.env.DB_SSL === "true",
  });
  if (!createPostgresRes.success) {
    logger.error(createPostgresRes.err);

    process.exit(1);
  }

  const serverKeypair = await initializeServerKeypair(
    createPostgresRes.data,
    loadEncSecretRes.data,
  );

  const state: ServerState = {
    db: createPostgresRes.data,
    encryptionSecret: loadEncSecretRes.data,
    serverKeypair,
    telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN!,
    is_db_backup_checked: true,
    launch_time,
    git_hash,
    version,
  };

  app.locals = state;

  startPgDumpRuntime(
    app.locals.db,
    {
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      password: process.env.DB_PASSWORD,
      user: process.env.DB_USER,
      port: Number(process.env.DB_PORT),
    },
    {
      sleepTimeSeconds: ONE_DAY_MS,
      retentionDays: 7,
      dumpDir: process.env.DUMP_DIR,
    },
  );

  startTelemetryReporterRuntime(
    app.locals.db,
    serverKeypair.publicKey.toHex(),
    process.env.OKO_API_BASE_URL!,
    process.env.KS_NODE_REPORT_PASSWORD!,
    180,
  );

  app.listen(process.env.PORT, () => {
    logger.info("Start server, listening on port: %s", process.env.PORT);
  });

  return;
}

main().then();
