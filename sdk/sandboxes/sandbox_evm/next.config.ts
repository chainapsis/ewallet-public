import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    KEPLR_EWALLET_SDK_ENDPOINT: "http://localhost:3201",
  },
};

export default nextConfig;
