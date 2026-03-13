"use client";

import { ChainProvider } from "@cosmos-kit/react";
import { makeOkoWallet } from "@oko-wallet/oko-cosmos-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { assets, chains } from "chain-registry";

import App from "@/components/App";
import "@interchain-ui/react/styles";

const queryClient = new QueryClient();

export default function Home() {
  const okoWallet = makeOkoWallet({
    apiKey: process.env.NEXT_PUBLIC_OKO_API_KEY!,
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ChainProvider
        chains={chains}
        assetLists={assets}
        wallets={[okoWallet]}
        throwErrors={false}
      >
        <App />
      </ChainProvider>
    </QueryClientProvider>
  );
}
