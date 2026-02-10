import { z } from "zod";

export const ENV_FILE_NAME = "oko_attached.env";
export const EXAMPLE_ENV_FILE = "oko_attached.env.example";

export const envSchema = z.object({
  SERVER_PORT: z.string(),

  VITE_OKO_API_ENDPOINT: z.string(),
  VITE_DEMO_WEB_ORIGIN: z.string(),
  VITE_KEPLR_API_ENDPOINT: z.string(),
  VITE_TX_INTERPRETER_API_ENDPOINT: z.string(),
  VITE_AMPLITUDE_API_KEY: z.string().optional().default(""),
  VITE_IPFS_GATEWAY_URL: z.string().optional().default(""),
  VITE_TELEGRAM_BOT_NAME: z.string(),
  VITE_USER_DASHBOARD_ORIGINS: z.string(),

  // Fee sponsorship (Base chain)
  VITE_FEE_SPONSORSHIP_ENDPOINT: z
    .string()
    .optional()
    .default("https://cosmos-fee-relayer.keplr.app"),
  VITE_FEE_SPONSORSHIP_API_KEY: z.string().optional().default(""),
});
