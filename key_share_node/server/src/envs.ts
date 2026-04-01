import fs from "node:fs";
import os from "node:os";
import type { Result } from "@oko-wallet/stdlib-js";
import * as dotenv from "dotenv";
import path from "path";
import { z } from "zod";

import { logger } from "./logger";

const ENV_FILE_NAME_STEM = "key_share_node";

export const ENV_FILE_NAME = "key_share_node.env";
export const EXAMPLE_ENV_FILE = "key_share_node.env.example";

export const ENV_FILE_NAME_2 = "key_share_node_2.env";
export const EXAMPLE_ENV_FILE_2 = "key_share_node_2.env.example";

export const ENV_FILE_NAME_3 = "key_share_node_3.env";
export const EXAMPLE_ENV_FILE_3 = "key_share_node_3.env.example";

interface Env {
  PORT: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: string;
  ENCRYPTION_SECRET_PATH: string;
  ADMIN_PASSWORD: string;
  DUMP_DIR: string;
  TELEGRAM_BOT_TOKEN: string;
  OKO_API_BASE_URL: string;
  KS_NODE_REPORT_PASSWORD: string;
}

const envSchema = z.object({
  PORT: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_SSL: z.string(),
  ENCRYPTION_SECRET_PATH: z.string(),
  ADMIN_PASSWORD: z.string(),
  DUMP_DIR: z.string(),
  TELEGRAM_BOT_TOKEN: z.string(),
  OKO_API_BASE_URL: z.string(),
  KS_NODE_REPORT_PASSWORD: z.string(),
});

export function loadEnv(nodeId: string): Result<void, string> {
  const nodeIdSuffix = nodeId === "1" ? "" : `_${nodeId}`;

  const envFileName = `${ENV_FILE_NAME_STEM}${nodeIdSuffix}.env`;

  const envPath = path.join(os.homedir(), ".oko", envFileName);

  if (!fs.existsSync(envPath)) {
    return { success: false, err: `Env file does not exist, path: ${envPath}` };
  } else {
    logger.info("Env file found, loading, path: %s", envPath);
  }

  dotenv.config({
    path: envPath,
    override: false,
  });

  return { success: true, data: void 0 };
}

export function verifyEnv(envs: Record<string, any>): Result<Env, string> {
  const res = envSchema.safeParse(envs);

  if (res.success) {
    return { success: true, data: res.data };
  } else {
    return { success: false, err: z.prettifyError(res.error) };
  }
}
