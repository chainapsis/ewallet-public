import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";

// const dev = process.env.NODE_ENV !== "production";
const port = process.env.SERVER_PORT;

export default defineConfig({
  server: {
    port: Number(port),
  },
  css: {
    modules: {
      localsConvention: "camelCase",
      generateScopedName: "[name]__[local]___[hash:base64:5]",
    },
  },
  resolve: {
    alias: {
      "@oko-wallet-attached": path.resolve(__dirname, "./src"),
      "@oko-wallet-common-ui": path.resolve(
        __dirname,
        "../../ui/oko_common_ui/src",
      ),
    },
  },
  plugins: [
    tsconfigPaths(),
    nodePolyfills(),
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    // ...,
  ],
});
