import path from "node:path";
import { loadEnv } from "@oko-wallet/dotenv";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { ENV_FILE_NAME } from "./src/envs";

loadEnv(ENV_FILE_NAME);
const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(",").filter(Boolean);
const hostConfig = allowedHosts?.length ? { allowedHosts } : {};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@oko-wallet-attached-mobile-host-web": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: Number(process.env.SERVER_PORT || 3207),
    ...hostConfig,
    strictPort: true,
    // Serve index.html for all paths (SPA fallback)
    middlewareMode: false,
  },
  preview: {
    port: Number(process.env.SERVER_PORT || 3207),
    ...hostConfig,
  },
  // Vite's appType defaults to "spa" which enables history API fallback
});
