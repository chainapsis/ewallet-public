declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SERVER_PORT: string;
      NEXT_PUBLIC_OKO_SDK_ENDPOINT: string;
      NEXT_PUBLIC_OKO_API_ENDPOINT: string;
      NEXT_PUBLIC_OKO_DOCS_ENDPOINT: string;
      NEXT_PUBLIC_OKO_DEMO_ENDPOINT: string;
      NEXT_PUBLIC_OKO_FEATURE_REQUEST_ENDPOINT: string;
      NEXT_PUBLIC_OKO_GET_SUPPORT_ENDPOINT: string;
      NEXT_PUBLIC_S3_BUCKET_URL: string;
      NEXT_PUBLIC_KEPLR_API_ENDPOINT: string;
      NEXT_PUBLIC_TX_CODEC_BASE_URL: string;
      NEXT_PUBLIC_TOPUP_BASE_URL: string;
      NEXT_PUBLIC_TX_HISTORY_BASE_URL: string;
      NEXT_PUBLIC_COINGECKO_ENDPOINT: string;
      NEXT_PUBLIC_COINGECKO_GETPRICE: string;
      NEXT_PUBLIC_COINGECKO_COIN_DATA_BY_TOKEN_ADDRESS: string;
      NEXT_PUBLIC_SKIP_TOKEN_INFO_API_URI: string;
      NEXT_PUBLIC_ETHEREUM_ENDPOINT: string;
      NEXT_PUBLIC_KEPLR_CHAIN_REGISTRY_ENDPOINT: string;
    }
  }
}

// Ensures this file is treated as a module (necessary if esm)
export {};
