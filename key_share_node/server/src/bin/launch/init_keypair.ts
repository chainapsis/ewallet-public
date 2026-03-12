import { Bytes } from "@oko-wallet/bytes";
import {
  type EddsaKeypair,
  generateEddsaKeypair,
} from "@oko-wallet/crypto-js/node/ecdhe";
import {
  getActiveServerKeypair,
  insertServerKeypair,
} from "@oko-wallet/ksn-pg-interface";
import type { Pool } from "pg";

import {
  decryptDataAsync,
  encryptDataAsync,
} from "@oko-wallet-ksn-server/encrypt";
import { logger } from "@oko-wallet-ksn-server/logger";

export async function initializeServerKeypair(
  db: Pool,
  encryptionSecret: string,
): Promise<EddsaKeypair> {
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

  logger.info("No active server keypair found, generating new one...");
  const keypairRes = generateEddsaKeypair();
  if (!keypairRes.success) {
    throw new Error(`Failed to generate EdDSA keypair: ${keypairRes.err}`);
  }

  const { privateKey, publicKey } = keypairRes.data;
  const privateKeyHex = privateKey.toHex();

  const encryptedPrivateKey = await encryptDataAsync(
    privateKeyHex,
    encryptionSecret,
  );

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
