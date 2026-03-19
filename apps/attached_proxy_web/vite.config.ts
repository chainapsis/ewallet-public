import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@oko-wallet-attached-proxy-web": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: Number(process.env.SERVER_PORT || 3207),
    strictPort: true,
    // Serve index.html for all paths (SPA fallback)
    middlewareMode: false,
  },
  preview: {
    port: Number(process.env.SERVER_PORT || 3207),
  },
  // Vite's appType defaults to "spa" which enables history API fallback
});
