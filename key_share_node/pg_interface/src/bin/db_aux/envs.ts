import os from "node:os";
import * as dotenv from "dotenv";
import path from "path";
import { z } from "zod";

import type { PgDatabaseConfig } from "./utils";

const ENV_FILE_NAME_STEM = "key_share_node";

const envSchema = z.object({
  DB_HOST: z.string("DB_HOST is required"),
  DB_PORT: z.number().min(1, "DB_PORT is required"),
  DB_USER: z.string("DB_USER is required"),
  DB_PASSWORD: z.string("DB_PASSWORD is required"),
  DB_NAME: z.string("DB_NAME is required"),
  DB_SSL: z.boolean(),
});

export function loadEnvs(nodeId: number): PgDatabaseConfig {
  const nodeIdSuffix = nodeId === 1 ? "" : `_${nodeId}`;
  const envFileName = `${ENV_FILE_NAME_STEM}${nodeIdSuffix}.env`;
  console.log("Loading envs from: %s", envFileName);
  const envPath = path.join(os.homedir(), ".oko", envFileName);

  dotenv.config({
    path: envPath,
    override: true,
  });

  const rawEnv = {
    DB_HOST: process.env.DB_HOST!,
    DB_PORT: parseInt(process.env.DB_PORT!, 10),
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_NAME: process.env.DB_NAME!,
    DB_SSL: process.env.DB_SSL === "true",
  };

  const envs = envSchema.parse(rawEnv);
  console.log("Loaded envs: %j", envs);

  return {
    database: envs.DB_NAME,
    host: envs.DB_HOST,
    password: envs.DB_PASSWORD,
    user: envs.DB_USER,
    port: envs.DB_PORT,
    ssl: envs.DB_SSL,
  };
}
