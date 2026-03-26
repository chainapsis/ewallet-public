"use client";

import { OkoProvider as OkoSDKProvider } from "@oko-wallet/oko-sdk-react";
import type { FC, PropsWithChildren } from "react";

import { useThemeSync } from "@oko-wallet-demo-web/hooks/use_theme_sync";

const okoConfig = {
  apiKey: "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c",
  sdkEndpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
  eth: true as const,
  cosmos: true as const,
  svm: { chainId: "solana:devnet" },
};

const InnerProvider: FC<PropsWithChildren> = ({ children }) => {
  useThemeSync();

  return <>{children}</>;
};

export const OkoProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <OkoSDKProvider config={okoConfig}>
      <InnerProvider>{children}</InnerProvider>
    </OkoSDKProvider>
  );
};
