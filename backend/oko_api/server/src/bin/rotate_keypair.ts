import { encryptDataAsync } from "@oko-wallet/crypto-js/node";
import { generateEddsaKeypair } from "@oko-wallet/crypto-js/node/ecdhe";
import { loadEnv, verifyEnv } from "@oko-wallet/dotenv";
import { createPgDatabase } from "@oko-wallet/oko-api-server-state/database";
import {
  getAllServerKeypairs,
  rotateServerKeypair,
} from "@oko-wallet/oko-pg-interface/server_keypairs";

import { ENV_FILE_NAME, envSchema } from "@oko-wallet-api/envs";

loadEnv(ENV_FILE_NAME);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "list") {
    await listKeypairs();
  } else if (command === "rotate") {
    await rotate();
  } else {
    printHelp();
  }
}

function printHelp() {
  console.log(`
Server Keypair Management CLI

Usage:
  rotate_keypair <command>

Commands:
  list      List all server keypairs with their versions and status
  rotate    Generate a new keypair and deactivate the current one

Examples:
  yarn rotate_keypair list
  yarn rotate_keypair rotate
`);
}

async function connectDb() {
  const envRes = verifyEnv(envSchema, process.env);
  if (!envRes.success) {
    console.error("Env variable invalid\n%s", envRes.err);
    process.exit(1);
  }

  const envs = process.env;

  const createPostgresRes = await createPgDatabase({
    database: envs.DB_NAME!,
    host: envs.DB_HOST!,
    password: envs.DB_PASSWORD!,
    user: envs.DB_USER!,
    port: parseInt(envs.DB_PORT!, 10),
    ssl: envs.DB_SSL === "true",
  });

  if (!createPostgresRes.success) {
    console.error("Failed to connect to database: %s", createPostgresRes.err);
    process.exit(1);
  }

  return {
    db: createPostgresRes.data,
    encryptionSecret: envs.ENCRYPTION_SECRET!,
  };
}

async function listKeypairs() {
  const { db } = await connectDb();

  const keypairsRes = await getAllServerKeypairs(db);
  if (!keypairsRes.success) {
    console.error("Failed to get keypairs: %s", keypairsRes.err);
    process.exit(1);
  }

  const keypairs = keypairsRes.data;

  if (keypairs.length === 0) {
    console.log("No server keypairs found.");
    await db.end();
    return;
  }

  console.log("\nServer Keypairs:");
  console.log("─".repeat(100));
  console.log(
    "Version".padEnd(10) +
      "Public Key".padEnd(68) +
      "Active".padEnd(10) +
      "Created At",
  );
  console.log("─".repeat(100));

  for (const kp of keypairs) {
    const publicKeyHex = kp.public_key.toString("hex");
    const activeStatus = kp.is_active ? "✓ Yes" : "✗ No";
    const createdAt = kp.created_at.toISOString().split("T")[0];

    console.log(
      String(kp.version).padEnd(10) +
        publicKeyHex.padEnd(68) +
        activeStatus.padEnd(10) +
        createdAt,
    );
  }

  console.log("─".repeat(100));
  console.log(`Total: ${keypairs.length} keypair(s)\n`);

  await db.end();
}

async function rotate() {
  const { db, encryptionSecret } = await connectDb();

  console.log("\nGenerating new EdDSA keypair...");

  const keypairRes = generateEddsaKeypair();
  if (!keypairRes.success) {
    console.error("Failed to generate keypair: %s", keypairRes.err);
    await db.end();
    process.exit(1);
  }

  const { privateKey, publicKey } = keypairRes.data;
  const privateKeyHex = privateKey.toHex();
  const publicKeyHex = publicKey.toHex();

  console.log("Encrypting private key...");
  const encryptedPrivateKey = await encryptDataAsync(
    privateKeyHex,
    encryptionSecret,
  );

  console.log("Rotating keypair in database...");
  const rotateRes = await rotateServerKeypair(db, {
    public_key: Buffer.from(publicKey.toUint8Array()),
    enc_private_key: encryptedPrivateKey,
  });

  if (!rotateRes.success) {
    console.error("Failed to rotate keypair: %s", rotateRes.err);
    await db.end();
    process.exit(1);
  }

  console.log("\n✓ Keypair rotated successfully!");
  console.log("  New version: %d", rotateRes.data.version);
  console.log("  Public key:  %s", publicKeyHex);
  console.log("\nNote: Restart the server to use the new keypair.\n");

  await db.end();
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
