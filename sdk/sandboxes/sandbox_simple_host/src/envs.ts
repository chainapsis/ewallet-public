import { z } from "zod";

let lazy: { env: EnvType | null } = {
  env: null,
};

export interface EnvType {
  SERVER_PORT: number;
  KEPLR_EWALLET_URL: string;
}

const envSchema = z.object({
  SERVER_PORT: z.number(),
  KEPLR_EWALLET_URL: z.string().min(1, "KEPLR_EWALLET_URL is required"),
});

// export function getEnv(): EnvType {
//   if (lazy.env !== null) {
//     return lazy.env;
//   } else {
//     const env = loadEnv();
//     lazy.env = env;
//     return env;
//   }
// }
