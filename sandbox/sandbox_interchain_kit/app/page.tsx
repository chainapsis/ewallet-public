"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChainProvider, InterchainWalletModal } from "@interchain-kit/react";
import { chains, assetLists } from "@chain-registry/v2";
import App from "@/components/App";
import { makeOkoWallet } from "@oko-wallet/oko-interchain-kit";
import "@interchain-kit/react/styles.css";

const queryClient = new QueryClient();

// Filter chains to only include osmosis for testing
const filteredChains = chains.filter((chain) => chain.chainName === "osmosis");
const filteredAssetLists = assetLists.filter(
  (assetList) => assetList.chainName === "osmosis",
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
        endpointOptions={{
          endpoints: {
            osmosis: {
              rpc: ["https://rpc.cosmos.directory/osmosis"],
              rest: ["https://rest.cosmos.directory/osmosis"],
            },
          },
        }}
      >
        <App />
      </ChainProvider>
    </QueryClientProvider>
  );
}
