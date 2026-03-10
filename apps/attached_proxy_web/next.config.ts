import type { NextConfig } from "next";

const PROXY_HOST = "127.0.0.1:3207";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [PROXY_HOST],
};

export default nextConfig;
