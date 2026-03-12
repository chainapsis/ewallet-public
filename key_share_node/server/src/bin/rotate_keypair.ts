import { generateEddsaKeypair } from "@oko-wallet/crypto-js/node/ecdhe";
import {
  getAllServerKeypairs,
  rotateServerKeypair,
} from "@oko-wallet/ksn-pg-interface";
import { Command } from "commander";

import { loadEncSecret } from "./launch/load_enc_secret";
import { connectPG } from "@oko-wallet-ksn-server/database";
import { encryptDataAsync } from "@oko-wallet-ksn-server/encrypt";
import { loadEnv, verifyEnv } from "@oko-wallet-ksn-server/envs";

const DEFAULT_NODE_ID = "1";

const program = new Command();

program
  .name("rotate_keypair")
  .description("Server Keypair Management CLI for Key Share Node")
  .option("--node-id <id>", "Node ID (1, 2, or 3)", DEFAULT_NODE_ID)
  .option("--list", "List all server keypairs")
  .option("--rotate", "Rotate server keypair");

program.parse();

const opts = program.opts();

async function main() {
  const nodeId = opts.nodeId;

  console.log(
    `Using node-id: ${nodeId}${nodeId === DEFAULT_NODE_ID ? " (default)" : ""}`,
  );

  loadEnv(nodeId);

  const verifyEnvRes = verifyEnv(process.env);
  if (!verifyEnvRes.success) {
    console.error("Env variable invalid\n%s", verifyEnvRes.err);
    process.exit(1);
  }

  const loadEncSecretRes = loadEncSecret(process.env.ENCRYPTION_SECRET_PATH);
  if (!loadEncSecretRes.success) {
    console.error("Encryption secret invalid: %s", loadEncSecretRes.err);
    process.exit(1);
  }

  const createPostgresRes = await connectPG({
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    port: Number(process.env.DB_PORT),
    ssl: process.env.DB_SSL === "true",
  });

  if (!createPostgresRes.success) {
    console.error("Failed to connect to database: %s", createPostgresRes.err);
    process.exit(1);
  }

  const db = createPostgresRes.data;
  const encryptionSecret = loadEncSecretRes.data;

  if (opts.list) {
    await listKeypairs(db);
  } else if (opts.rotate) {
    await rotate(db, encryptionSecret);
  } else {
    printHelp();
  }

  await db.end();
}

function printHelp() {
  console.log(`
Server Keypair Management CLI for Key Share Node

Usage:
  rotate_keypair [--node-id=<id>] <command>

Options:
  --node-id   Node ID (1, 2, or 3). Default: 1 (production)

Commands:
  --list      List all server keypairs with their versions and status
  --rotate    Generate a new keypair and deactivate the current one

Examples:
  yarn rotate_keypair --list              # Uses default node-id=1
  yarn rotate_keypair --rotate            # Uses default node-id=1
  yarn rotate_keypair --node-id=2 --list  # Specify node-id for multi-node setup
`);
}

async function listKeypairs(db: any) {
  const keypairsRes = await getAllServerKeypairs(db);
  if (!keypairsRes.success) {
    console.error("Failed to get keypairs: %s", keypairsRes.err);
    process.exit(1);
  }

  const keypairs = keypairsRes.data;

  if (keypairs.length === 0) {
    console.log("No server keypairs found.");
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
}

async function rotate(db: any, encryptionSecret: string) {
  console.log("\nGenerating new EdDSA keypair...");

  const keypairRes = generateEddsaKeypair();
  if (!keypairRes.success) {
    console.error("Failed to generate keypair: %s", keypairRes.err);
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
    process.exit(1);
  }

  console.log("\n✓ Keypair rotated successfully!");
  console.log("  New version: %d", rotateRes.data.version);
  console.log("  Public key:  %s", publicKeyHex);
  console.log("\nNote: Restart the server to use the new keypair.\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
