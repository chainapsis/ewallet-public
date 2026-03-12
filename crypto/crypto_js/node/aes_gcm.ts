// TODO: Remove sync functions @chemonoworld after publishing new version

import {
  createCipheriv,
  createDecipheriv,
  pbkdf2,
  pbkdf2Sync,
  randomBytes,
} from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);

// deprecated
export function encryptData(data: string, password: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, 100000, 32, "sha256");

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]).toString("base64");
}

// deprecated
export function decryptData(encryptedBase64: string, password: string): string {
  const buffer = Buffer.from(encryptedBase64, "base64");

  const salt = buffer.subarray(0, 16);
  const iv = buffer.subarray(16, 28);
  const authTag = buffer.subarray(28, 44);
  const encrypted = buffer.subarray(44);

  const key = pbkdf2Sync(password, salt, 100000, 32, "sha256");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function encryptDataAsync(
  data: string,
  password: string,
): Promise<string> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await pbkdf2Async(password, salt, 100000, 32, "sha256");

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]).toString("base64");
}

export async function decryptDataAsync(
  encryptedBase64: string,
  password: string,
): Promise<string> {
  const buffer = Buffer.from(encryptedBase64, "base64");
  const salt = buffer.subarray(0, 16);
  const iv = buffer.subarray(16, 28);
  const authTag = buffer.subarray(28, 44);
  const encrypted = buffer.subarray(44);

  const key = await pbkdf2Async(password, salt, 100000, 32, "sha256");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
