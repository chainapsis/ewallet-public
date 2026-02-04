import { Pool } from "pg";
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
  database: "oko_api_e2e_test",
  host: "localhost",
  password: "postgres",
  user: "postgres",
  port: 5432,
  ssl: false,
};

export const createKsnDbConfig = (nodeId: number): PgDatabaseConfig => ({
  database: `ksn_e2e_test_${nodeId}`,
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

export async function ensureDatabaseExists(
  config: PgDatabaseConfig,
): Promise<void> {
  const adminPool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: "postgres",
  });

  try {
    const result = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.database],
    );

    if (result.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${config.database}"`);
      console.log(`Created database: ${config.database}`);
    }
  } finally {
    await adminPool.end();
  }
}

export async function initializeOkoApiSchema(pool: Pool): Promise<void> {
  // Create oko_api tables expected by oko_pg_interface
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oko_users (
      user_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      email varchar(255) NOT NULL,
      auth_type varchar(64) NOT NULL,
      status varchar(32) DEFAULT 'ACTIVE' NOT NULL,
      metadata jsonb NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT oko_users_email_auth_type_key UNIQUE (email, auth_type)
    );

    CREATE TABLE IF NOT EXISTS oko_wallets (
      wallet_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      user_id uuid NOT NULL,
      curve_type varchar(16) NOT NULL,
      public_key bytea NOT NULL UNIQUE,
      enc_tss_share bytea NOT NULL,
      sss_threshold int2 DEFAULT 2 NOT NULL,
      status varchar(32) DEFAULT 'ACTIVE' NOT NULL,
      metadata jsonb NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commit_reveal_sessions (
      session_id uuid NOT NULL PRIMARY KEY,
      operation_type varchar(32) NOT NULL,
      client_ephemeral_pubkey bytea NOT NULL UNIQUE,
      id_token_hash varchar(64) NOT NULL UNIQUE,
      state varchar(16) DEFAULT 'COMMITTED' NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      expires_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commit_reveal_api_calls (
      id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      session_id uuid NOT NULL,
      api_name varchar(64) NOT NULL,
      signature bytea NOT NULL UNIQUE,
      called_at timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT cr_api_calls_session_api_key UNIQUE (session_id, api_name)
    );

    CREATE TABLE IF NOT EXISTS server_keypairs (
      keypair_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      version int4 GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
      public_key bytea NOT NULL,
      enc_private_key text NOT NULL,
      is_active bool DEFAULT true NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      rotated_at timestamptz NULL
    );

    CREATE TABLE IF NOT EXISTS key_share_node_meta (
      meta_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      sss_threshold int2 NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS key_share_nodes (
      node_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      node_name varchar(255) NOT NULL,
      server_url varchar(255) NOT NULL,
      status varchar(32) DEFAULT 'ACTIVE' NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      deleted_at timestamptz NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_ks_nodes (
      wallet_ks_node_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      wallet_id uuid NOT NULL,
      node_id uuid NOT NULL,
      status varchar(32) DEFAULT 'ACTIVE' NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT wallet_ks_nodes_wallet_id_node_id_key UNIQUE (wallet_id, node_id)
    );
    -- Ensure status column exists on oko_users
    ALTER TABLE oko_users
      ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'ACTIVE' NOT NULL;
  `);
}

export async function seedOkoApiTestData(
  pool: Pool,
  ksnUrls: string[],
): Promise<void> {
  // Check if already seeded
  const hasData = await pool.query(`SELECT 1 FROM key_share_node_meta LIMIT 1`);
  if (hasData.rows.length > 0) {
    return;
  }

  // Seed key_share_node_meta
  await pool.query(`
    INSERT INTO key_share_node_meta (sss_threshold) VALUES (2);
  `);

  // Seed key_share_nodes with actual URLs
  for (let i = 0; i < ksnUrls.length; i++) {
    await pool.query(
      `INSERT INTO key_share_nodes (node_name, server_url, status) VALUES ($1, $2, 'ACTIVE')`,
      [`test_node_${i + 1}`, ksnUrls[i]],
    );
  }
}

export async function initializeKsnSchema(pool: Pool): Promise<void> {
  const hasTable = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = '2_users'`,
  );
  if (hasTable.rows.length > 0) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "2_users" (
      user_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      auth_type varchar(64) NOT NULL,
      user_auth_id varchar(255) NOT NULL,
      status varchar(16) DEFAULT 'active' NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      aux jsonb NULL,
      CONSTRAINT "2_users_auth_type_user_auth_id_key" UNIQUE (auth_type, user_auth_id)
    );

    CREATE TABLE IF NOT EXISTS "2_wallets" (
      wallet_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      user_id uuid NOT NULL,
      curve_type varchar(16) NOT NULL,
      public_key bytea NOT NULL UNIQUE,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      aux jsonb NULL
    );

    CREATE TABLE IF NOT EXISTS "2_key_shares" (
      share_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      wallet_id uuid NOT NULL UNIQUE,
      enc_share bytea NOT NULL,
      status varchar NOT NULL,
      reshared_at timestamptz DEFAULT now() NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      aux jsonb NULL
    );

    CREATE TABLE IF NOT EXISTS "2_server_keypairs" (
      keypair_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      version int4 GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
      public_key bytea NOT NULL,
      enc_private_key text NOT NULL,
      is_active bool DEFAULT true NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      rotated_at timestamptz NULL
    );

    CREATE TABLE IF NOT EXISTS "2_commit_reveal_sessions" (
      session_id uuid NOT NULL PRIMARY KEY,
      operation_type varchar(32) NOT NULL,
      client_ephemeral_pubkey bytea NOT NULL UNIQUE,
      id_token_hash varchar(64) NOT NULL UNIQUE,
      state varchar(16) DEFAULT 'COMMITTED' NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      expires_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "2_commit_reveal_api_calls" (
      id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      session_id uuid NOT NULL,
      api_name varchar(64) NOT NULL,
      signature bytea NOT NULL UNIQUE,
      called_at timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT "2_cr_api_calls_session_api_key" UNIQUE (session_id, api_name)
    );
  `);
}
