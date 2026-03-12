import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, dev }) => {
    config.output.webassemblyModuleFilename =
      isServer && !dev
        ? "../static/pkg/[modulehash].wasm"
        : "static/pkg/[modulehash].wasm";

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Deubbing (vercel/next.js/issues/27650)
    // config.infrastructureLogging = { debug: /PackFileCache/ };

    return config;
  },
};

export default nextConfig;
