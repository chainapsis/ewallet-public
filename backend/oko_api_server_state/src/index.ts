import { Pool } from "pg";
import {
  generateEddsaKeypair,
  type EddsaKeypair,
} from "@oko-wallet/crypto-js/node/ecdhe";
import { Bytes } from "@oko-wallet/bytes";
import { encryptDataAsync, decryptDataAsync } from "@oko-wallet/crypto-js/node";
import {
  getActiveServerKeypair,
  insertServerKeypair,
} from "@oko-wallet/oko-pg-interface/server_keypairs";

import { createPgDatabase } from "./database";
import { initLogger } from "./logger";
import type { Logger } from "winston";

export async function makeServerState(
  args: InitStateArgs,
): Promise<ServerState> {
  try {
    const { smtp_port, email_verification_expiration_minutes, ...rest } = args;

    const createPostgresRes = await createPgDatabase({
      database: args.db_name,
      host: args.db_host,
      password: args.db_password,
      user: args.db_user,
      port: parseInt(args.db_port, 10),
      ssl: args.db_ssl === "true",
    });
    if (createPostgresRes.success === false) {
      throw new Error(createPostgresRes.err);
    }
    const db = createPostgresRes.data;

    const logger = initLogger({
      esUrl: args.es_url,
      esIndex: args.es_index,
      esUsername: args.es_username,
      esPassword: args.es_password,
    });

    const smtpPort = parseInt(smtp_port, 10);
    const emailVerificationExpirationMinutes = parseInt(
      email_verification_expiration_minutes,
      10,
    );
    if (Number.isNaN(smtpPort) || smtpPort <= 0) {
      throw new Error("Invalid arguments: smtpPort");
    }
    if (
      Number.isNaN(emailVerificationExpirationMinutes) ||
      emailVerificationExpirationMinutes <= 0
    ) {
      throw new Error("Invalid arguments: emailVerificationExpirationMinutes");
    }

    // Initialize or fetch server keypair
    const serverKeypair = await initializeServerKeypair(
      db,
      args.encryption_secret,
      logger,
    );

    return {
      db,
      logger,
      smtp_port: smtpPort,
      email_verification_expiration_minutes: emailVerificationExpirationMinutes,
      server_keypair: serverKeypair,
      ...rest,
    };
  } catch (error) {
    console.error("Failed to make server state: %s", error);
    throw error;
  }
}

export interface ServerState {
  git_hash: string;
  db: Pool;
  logger: Logger;
  jwt_secret: string;
  jwt_expires_in: string;
  es_url: string | null;
  es_index: string | null;
  es_client_index: string | null;
  es_username: string | null;
  es_password: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  email_verification_expiration_minutes: number;
  s3_region: string;
  s3_access_key_id: string;
  s3_secret_access_key: string;
  s3_bucket: string;
  encryption_secret: string;
  typeform_webhook_secret: string;
  telegram_bot_token: string;
  slack_webhook_url: string | null;
  ks_node_report_password: string;
  server_keypair: EddsaKeypair;
}

export interface InitStateArgs {
  git_hash: string;
  jwt_secret: string;
  jwt_expires_in: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  email_verification_expiration_minutes: string;
  s3_region: string;
  s3_access_key_id: string;
  s3_secret_access_key: string;
  s3_bucket: string;
  db_host: string;
  db_port: string;
  db_user: string;
  db_password: string;
  db_name: string;
  db_ssl: string;
  es_url: string | null;
  es_index: string | null;
  es_client_index: string | null;
  es_username: string | null;
  es_password: string | null;
  encryption_secret: string;
  typeform_webhook_secret: string;
  telegram_bot_token: string;
  slack_webhook_url: string | null;
  ks_node_report_password: string;
}

async function initializeServerKeypair(
  db: Pool,
  encryptionSecret: string,
  logger: Logger,
): Promise<EddsaKeypair> {
  // Check if there's an active keypair
  const activeKeypairRes = await getActiveServerKeypair(db);
  if (!activeKeypairRes.success) {
    throw new Error(
      `Failed to get active server keypair: ${activeKeypairRes.err}`,
    );
  }

  if (activeKeypairRes.data) {
    logger.info(
      "Using existing server keypair (version: %d)",
      activeKeypairRes.data.version,
    );

    // Decrypt private key and reconstruct EddsaKeypair
    const privateKeyHex = await decryptDataAsync(
      activeKeypairRes.data.enc_private_key,
      encryptionSecret,
    );

    const privateKeyRes = Bytes.fromHexString(privateKeyHex, 32);
    if (!privateKeyRes.success) {
      throw new Error(`Failed to parse private key: ${privateKeyRes.err}`);
    }

    const publicKeyRes = Bytes.fromUint8Array(
      activeKeypairRes.data.public_key,
      32,
    );
    if (!publicKeyRes.success) {
      throw new Error(`Failed to parse public key: ${publicKeyRes.err}`);
    }

    return {
      privateKey: privateKeyRes.data,
      publicKey: publicKeyRes.data,
    };
  }

  // Generate new keypair
  logger.info("No active server keypair found, generating new one...");
  const keypairRes = generateEddsaKeypair();
  if (!keypairRes.success) {
    throw new Error(`Failed to generate EdDSA keypair: ${keypairRes.err}`);
  }

  const { privateKey, publicKey } = keypairRes.data;
  const privateKeyHex = privateKey.toHex();

  // Encrypt private key
  const encryptedPrivateKey = await encryptDataAsync(
    privateKeyHex,
    encryptionSecret,
  );

  // Insert keypair (version is auto-incremented)
  const insertRes = await insertServerKeypair(db, {
    public_key: Buffer.from(publicKey.toUint8Array()),
    enc_private_key: encryptedPrivateKey,
  });
  if (!insertRes.success) {
    throw new Error(`Failed to insert server keypair: ${insertRes.err}`);
  }

  logger.info(
    "Generated new server keypair (version: %d)",
    insertRes.data.version,
  );
  return keypairRes.data;
}
