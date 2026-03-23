import { z } from "zod";

export const ENV_FILE_NAME = "user_dashboard.env";
export const EXAMPLE_ENV_FILE = "user_dashboard.env.example";

export const envSchema = z.object({
  SERVER_PORT: z.string(),
  NEXT_PUBLIC_OKO_SDK_ENDPOINT: z.string(),
  NEXT_PUBLIC_OKO_API_ENDPOINT: z.string(),
  NEXT_PUBLIC_OKO_DEMO_ENDPOINT: z.string(),
  NEXT_PUBLIC_OKO_DOCS_ENDPOINT: z.string(),
  NEXT_PUBLIC_OKO_FEATURE_REQUEST_ENDPOINT: z.string(),
  NEXT_PUBLIC_OKO_GET_SUPPORT_ENDPOINT: z.string(),
  NEXT_PUBLIC_S3_BUCKET_URL: z.string(),
  NEXT_PUBLIC_KEPLR_API_ENDPOINT: z.string(),
  NEXT_PUBLIC_TX_CODEC_BASE_URL: z.string(),
  NEXT_PUBLIC_TOPUP_BASE_URL: z.string(),
  NEXT_PUBLIC_TX_HISTORY_BASE_URL: z.string(),
  NEXT_PUBLIC_COINGECKO_ENDPOINT: z.string(),
  NEXT_PUBLIC_COINGECKO_GETPRICE: z.string(),
  NEXT_PUBLIC_COINGECKO_COIN_DATA_BY_TOKEN_ADDRESS: z.string(),
  NEXT_PUBLIC_SKIP_TOKEN_INFO_API_URI: z.string(),
  NEXT_PUBLIC_ETHEREUM_ENDPOINT: z.string(),
  NEXT_PUBLIC_KEPLR_CHAIN_REGISTRY_ENDPOINT: z.string(),
});
