import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*"],
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
