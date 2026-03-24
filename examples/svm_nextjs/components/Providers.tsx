"use client";

import { OkoProvider, type OkoProviderConfig } from "@oko-wallet/oko-sdk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";

interface ProvidersProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

const okoConfig: OkoProviderConfig = {
  apiKey: process.env.NEXT_PUBLIC_OKO_API_KEY ?? "",
  sdkEndpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
  svm: { chainId: "solana:devnet" },
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <OkoProvider config={okoConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </OkoProvider>
  );
}
