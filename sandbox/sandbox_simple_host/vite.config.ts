import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode: _mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the
  // `VITE_` prefix.
  // const _env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      port: 3200,
    },
    plugins: [
      react(),
      tsconfigPaths(),
      nodePolyfills({
        globals: {
          Buffer: true,
        },
      }),
    ],
  };
});
