loadEnv(ENV_FILE_NAME);

import { loadEnv, verifyEnv } from "@oko-wallet/dotenv";
import {
  makeServerState,
  type ServerState,
} from "@oko-wallet/oko-api-server-state";
import knexConfig from "@oko-wallet/oko-pg-interface/knexfile";
import knex from "knex";

import { makeApp } from "@oko-wallet-api/app";
import { ENV_FILE_NAME, envSchema } from "@oko-wallet-api/envs";
import { getCommitHash } from "@oko-wallet-api/git";
import { startKSNodeHealthCheckRuntime } from "@oko-wallet-api/runtime/health_check_node";
import { startInactiveCustomerUserReminderRuntime } from "@oko-wallet-api/runtime/inactive_customer_user_reminders";
import { startKSNodeHeartbeatRuntime } from "@oko-wallet-api/runtime/ks_node_monitor";
import { startUnverifiedCustomerUserReminderRuntime } from "@oko-wallet-api/runtime/unverified_customer_user_reminders";

async function main() {
  console.log("NODE_ENV: %s", process.env.NODE_ENV);

  const git_hash = getCommitHash();
  console.log("git hash: %s", git_hash);

  const envRes = verifyEnv(envSchema, process.env);
  if (!envRes.success) {
    console.error("Env variable invalid\n%s", envRes.err);
    process.exit(1);
  }

  const envs = process.env;

  // Run migrations before initializing server state
  console.log("Running database migrations...");
  try {
    const migrationConfig = {
      client: "pg",
      connection: {
        host: envs.DB_HOST,
        port: Number(envs.DB_PORT),
        user: envs.DB_USER,
        password: envs.DB_PASSWORD,
        database: envs.DB_NAME,
        ssl: envs.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      },
      migrations: knexConfig.migrations,
    };
    const knexInstance = knex(migrationConfig);
    await knexInstance.migrate.latest();
    await knexInstance.destroy();
    console.log("Database migrations completed successfully");
  } catch (err) {
    console.error("Migration failed, err: %s", err);
    process.exit(1);
  }

  const state: ServerState = await makeServerState({
    git_hash,
    jwt_secret: envs.JWT_SECRET!,
    jwt_expires_in: envs.JWT_EXPIRES_IN!,
    smtp_host: envs.SMTP_HOST!,
    smtp_port: envs.SMTP_PORT!,
    smtp_user: envs.SMTP_USER!,
    smtp_pass: envs.SMTP_PASS!,
    from_email: envs.FROM_EMAIL!,
    email_verification_expiration_minutes:
      envs.EMAIL_VERIFICATION_EXPIRATION_MINUTES!,
    s3_region: envs.S3_REGION!,
    s3_access_key_id: envs.S3_ACCESS_KEY_ID!,
    s3_secret_access_key: envs.S3_SECRET_ACCESS_KEY!,
    s3_bucket: envs.S3_BUCKET!,
    db_host: envs.DB_HOST!,
    db_port: envs.DB_PORT!,
    db_user: envs.DB_USER!,
    db_password: envs.DB_PASSWORD!,
    db_name: envs.DB_NAME!,
    db_ssl: envs.DB_SSL!,
    es_url: envs.ES_URL ?? null,
    es_index: envs.ES_INDEX ?? null,
    es_client_index: envs.ES_CLIENT_INDEX ?? null,
    es_username: envs.ES_USERNAME ?? null,
    es_password: envs.ES_PASSWORD ?? null,
    encryption_secret: envs.ENCRYPTION_SECRET!,
    typeform_webhook_secret: envs.TYPEFORM_WEBHOOK_SECRET!,
    telegram_bot_token: envs.TELEGRAM_BOT_TOKEN!,
    telegram_client_secret: envs.TELEGRAM_CLIENT_SECRET,
    slack_webhook_url: envs.SLACK_WEBHOOK_URL ?? null,
    ks_node_report_password: envs.KS_NODE_REPORT_PASSWORD!,
    github_client_secret: envs.GITHUB_CLIENT_SECRET!,
    dapp_dashboard_url: envs.DAPP_DASHBOARD_URL!,
  });

  const app = makeApp(state);

  startKSNodeHealthCheckRuntime(state.db, state.logger, {
    intervalSeconds: 10 * 60, // 10 minutes
  });

  startKSNodeHeartbeatRuntime(state.db, state.logger, {
    intervalSeconds: 60, // 1 minute
    slackWebhookUrl: state.slack_webhook_url,
  });

  startInactiveCustomerUserReminderRuntime(state.db, state.logger, {
    intervalSeconds: 60 * 60, // 1 hour
    timeUntilInactiveMs: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    smtpConfig: {
      smtp_host: state.smtp_host,
      smtp_port: state.smtp_port,
      smtp_user: state.smtp_user,
      smtp_pass: state.smtp_pass,
    },
    fromEmail: state.from_email,
  });

  startUnverifiedCustomerUserReminderRuntime(state.db, state.logger, {
    intervalSeconds: 2 * 60 * 60, // 2 hours
    timeUntilVerifiedMs: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    smtpConfig: {
      smtp_host: state.smtp_host,
      smtp_port: state.smtp_port,
      smtp_user: state.smtp_user,
      smtp_pass: state.smtp_pass,
    },
    fromEmail: state.from_email,
  });

  app.listen(envs.SERVER_PORT, () => {
    state.logger.info(`Server listening on port: %s`, envs.SERVER_PORT);
  });

  return;
}

main().then();
