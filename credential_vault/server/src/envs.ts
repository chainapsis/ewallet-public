import * as dotenv from "dotenv";
import path from "path";
import { z } from "zod";
import os from "node:os";
import fs from "node:fs";

const ENV_FILE_NAME_STEM = "credential_vault";

const envSchema = z.object({
  COMMITTEE_ID: z.number().min(1),
  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: z.number().min(1),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_SSL: z.boolean(),
});

export function loadEnvs() {
  const committeeIdSuffix =
    process.env.COMMITTEE_ID === "1" ? "" : `_${process.env.COMMITTEE_ID}`;

  const envFileName = `${ENV_FILE_NAME_STEM}${committeeIdSuffix}.env`;

  const envPath = path.join(os.homedir(), ".keplr_ewallet", envFileName);
  console.info("Loading env file, path: %s", envPath);

  if (!fs.existsSync(envPath)) {
    throw new Error(`Env file does not exists, path: ${envPath}`);
  }

  dotenv.config({
    path: envPath,
    override: false,
  });

  const rawEnv = {
    COMMITTEE_ID: parseInt(process.env.COMMITTEE_ID || "1", 10),
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: parseInt(process.env.DB_PORT || "5432", 10),
    DB_USER: process.env.DB_USER || "postgres",
    DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
    DB_NAME: process.env.DB_NAME || "credential_vault_dev",
    DB_SSL: (process.env.DB_SSL || "false") === "true",
  };

  const envs = envSchema.parse(rawEnv);
  console.info("Loaded envs: %j", envs);

  return envs;
}

export const Envs = loadEnvs();
