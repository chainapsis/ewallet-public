import { z } from "zod";

export const ENV_FILE_NAME = "oko_api_server.env";
export const EXAMPLE_ENV_FILE = "oko_api_server.env.example";

export type Envs = z.infer<typeof envSchema>;

export const envSchema = z.object({
  SERVER_PORT: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.string(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  FROM_EMAIL: z.string(),

  EMAIL_VERIFICATION_EXPIRATION_MINUTES: z.string(),

  S3_REGION: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),

  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_SSL: z.string(),

  ES_URL: z.string().optional(),
  ES_INDEX: z.string().optional(),
  ES_CLIENT_INDEX: z.string().optional(),
  ES_USERNAME: z.string().optional(),
  ES_PASSWORD: z.string().optional(),

  ENCRYPTION_SECRET: z.string(),

  TYPEFORM_WEBHOOK_SECRET: z.string(),

  TELEGRAM_BOT_TOKEN: z.string(),

  SLACK_WEBHOOK_URL: z.string().optional(),
  KS_NODE_REPORT_PASSWORD: z.string(),
});
