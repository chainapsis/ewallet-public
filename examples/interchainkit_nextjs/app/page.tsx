"use client";

import { assetLists, chains } from "@chain-registry/v2";
import { ChainProvider, InterchainWalletModal } from "@interchain-kit/react";
import { makeOkoWallet } from "@oko-wallet/oko-interchain-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "@/components/App";
import "@interchain-kit/react/styles.css";

const queryClient = new QueryClient();

// Filter chains to only include osmosis testnet for testing
const filteredChains = chains.filter(
  (chain) => chain.chainName === "osmosistestnet",
);
const filteredAssetLists = assetLists.filter(
  (assetList) => assetList.chainName === "osmosistestnet",
);

export default function Home() {
  const okoWallet =
    typeof window !== "undefined"
      ? makeOkoWallet({
          apiKey: process.env.NEXT_PUBLIC_OKO_API_KEY!,
          sdkEndpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
        })
      : null;

  return (
    <QueryClientProvider client={queryClient}>
      <ChainProvider
        chains={filteredChains}
        assetLists={filteredAssetLists}
        wallets={okoWallet ? [okoWallet] : []}
        walletModal={() => <InterchainWalletModal />}
      >
        <App />
      </ChainProvider>
    </QueryClientProvider>
  );
}
