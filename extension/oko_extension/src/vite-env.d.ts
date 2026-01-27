/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OKO_API_KEY: string;
  readonly VITE_OKO_SDK_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
