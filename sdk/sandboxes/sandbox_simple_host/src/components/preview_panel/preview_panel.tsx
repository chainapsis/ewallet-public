"use client";

import cn from "classnames";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import styles from "./preview_panel.module.scss";
import { LoginWidget } from "@/components/widgets/login_widget/login_widget";
import { EthereumOffchainSignWidget } from "@/components/widgets/ethereum_offchain_sign_widget/ethereum_offchain_sign_widget";
import { CosmosOnchainSignWidget } from "@/components/widgets/cosmos_onchain_sign_widget/cosmos_onchain_sign_widget";
import { CosmosOffChainSignWidget } from "@/components/widgets/cosmos_offchain_sign_widget/cosmos_offchain_sign_widget";
import { EthereumOnchainSignWidget } from "@/components/widgets/ethereum_onchain_sign_widget/ethereum_onchain_sign_widget";
import { CosmosOnchainCosmJsSignWidget } from "@/components/widgets/cosmos_onchain_cosmjs_sign_widget/cosmos_onchain_cosmjs_sign_widget";

export const PreviewPanel = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className={styles.wrapper}>
        <div className={cn(styles.inner, "common-list-scroll")}>
          <div className={styles.col}>
            <LoginWidget />
            {/* <AddressWidget /> */}
            {/* <UserDataWidget userData={mockUserData} /> */}
          </div>
          <div className={styles.col}>
            <h2>Ethereum</h2>
            <EthereumOffchainSignWidget />
            <EthereumOnchainSignWidget />
          </div>
          {/*   <SignWidget */}
          {/*     chain="Ethereum" */}
          {/*     chainIcon={<EthereumIcon />} */}
          {/*     signType="onchain" */}
          {/*     signButtonOnClick={() => {}} */}
          {/*   /> */}
          {/*   <DocsWidget /> */}
          {/* </div> */}

          <div className={styles.col}>
            <h2>Cosmos</h2>
            <CosmosOffChainSignWidget />
            <CosmosOnchainSignWidget />
          </div>
          <div className={styles.col}>
            <h2>Cosmos (cosmjs)</h2>
            <CosmosOnchainCosmJsSignWidget />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
};

const mockUserData = {
  id: "did:privy:cmclkfp1d01mnk10m3rcz2ls9",
  createdAt: "2025-07-02T06:18:32.000Z",
  linkedAccounts: [
    {
      subject: "100493480280007461739",
      email: "eden@chainapsis.com",
      name: "Eden Choi",
      type: "google_oauth",
      verifiedAt: "2025-07-02T06:18:32.000Z",
      firstVerifiedAt: "2025-07-02T06:18:32.000Z",
      latestVerifiedAt: "2025-07-02T06:58:32.000Z",
    },
    {
      id: null,
      address: "0xe0B336a62b6280B8D879089c01daBD54CDad2e8f",
      type: "wallet",
      imported: false,
      delegated: false,
      verifiedAt: "2025-07-02T06:18:34.000Z",
      firstVerifiedAt: "2025-07-02T06:18:34.000Z",
      latestVerifiedAt: "2025-07-02T06:18:34.000Z",
      chainType: "ethereum",
      walletClientType: "privy",
      connectorType: "embedded",
      recoveryMethod: "privy",
      walletIndex: 0,
    },
    {
      id: null,
      address: "24hqw7F2WcGGCp1ZPbPsRDxjuL85iy63jvuQL4rKb58p",
      type: "wallet",
      imported: false,
      delegated: false,
      verifiedAt: "2025-07-02T06:18:37.000Z",
      firstVerifiedAt: "2025-07-02T06:18:34.000Z",
      latestVerifiedAt: "2025-07-02T06:18:34.000Z",
      chainType: "solana",
      walletClientType: "privy",
      connectorType: "embedded",
      recoveryMethod: "privy",
      walletIndex: 0,
    },
  ],
  wallet: {
    id: null,
    address: "0xe0B336a62b6280B8D879089c01daBD54CDad2e8f",
    chainType: "ethereum",
    walletClientType: "privy",
    connectorType: "embedded",
    recoveryMethod: "privy",
    imported: false,
    delegated: false,
    walletIndex: 0,
  },
  google: {
    subject: "100493480280007461739",
    email: "eden@chainapsis.com",
    name: "Eden Choi",
  },
  delegatedWallets: [],
  mfaMethods: [],
  hasAcceptedTerms: false,
  isGuest: false,
};
