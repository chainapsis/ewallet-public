import { z } from "zod";

export const ENV_FILE_NAME = "attached_proxy_web.env";
export const EXAMPLE_ENV_FILE = "attached_proxy_web.env.example";

export const envSchema = z.object({
  SERVER_PORT: z.string(),
  NEXT_PUBLIC_ATTACHED_ORIGIN: z.string().url(),
});
