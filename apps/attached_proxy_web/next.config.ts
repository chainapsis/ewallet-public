import type { NextConfig } from "next";

const PROXY_HOST = "proxy.damn.it.com";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [PROXY_HOST],
};

export default nextConfig;
