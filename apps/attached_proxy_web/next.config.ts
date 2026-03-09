import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["proxy.damn.it.com"],
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
