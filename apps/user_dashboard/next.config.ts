import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [100, 75],
    remotePatterns: [
      ...(process.env.NEXT_PUBLIC_S3_BUCKET_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.NEXT_PUBLIC_S3_BUCKET_URL).hostname,
            },
          ]
        : []),
    ],
  },
  typescript: {
    ignoreBuildErrors: true, // Rita: it should be removed after modularChainInfo changes in Wallet packages
  },
};

export default nextConfig;
