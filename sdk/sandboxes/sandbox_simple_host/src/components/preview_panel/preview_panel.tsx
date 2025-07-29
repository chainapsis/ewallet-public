"use client";

import cn from "classnames";

import styles from "./preview_panel.module.scss";
import { useKeplrEwallet } from "@/contexts/KeplrEwalletProvider";
import { LoginWidget } from "@/components/widgets/login_widget/login_widget";
import { EthereumOffchainSignWidget } from "@/components/widgets/ethereum_offchain_sign_widget/ethereum_offchain_sign_widget";
// import { LoginWidget } from "@keplr-ewallet-demo-web/components/widgets/login_widget/login_widget";
// import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";
// import { AddressWidget } from "@keplr-ewallet-demo-web/components/widgets/address_widget/address_widget";
// import { UserDataWidget } from "@keplr-ewallet-demo-web/components/widgets/user_data_widget/user_data_widget";
// import { DocsWidget } from "@keplr-ewallet-demo-web/components/widgets/docs_widget/docs_widget";
// import { SignWidget } from "@keplr-ewallet-demo-web/components/widgets/sign_widget/sign_widget";
// import { CosmosOnchainSignWidget } from "@keplr-ewallet-demo-web/components/widgets/cosmos_onchain_sign_widget/cosmos_onchain_sign_widget";
// import { EthereumOffchainSignWidget } from "@keplr-ewallet-demo-web/components/widgets/ethereum_offchain_sign_widget/ethereum_offchain_sign_widget";
// import { CosmosOffChainSignWidget } from "@keplr-ewallet-demo-web/components/widgets/cosmos_offchain_sign_widget/cosmos_offchain_sign_widget";

export const PreviewPanel = () => {
  const { cosmosEWallet, ethEWallet } = useKeplrEwallet();

  console.log("cosmosEWallet !!!", cosmosEWallet);

  return (
    <div className={styles.wrapper}>
      <div className={cn(styles.inner, "common-list-scroll")}>
        <div className={styles.col}>
          <LoginWidget />
          {/* <AddressWidget /> */}
          {/* <UserDataWidget userData={mockUserData} /> */}
        </div>
        {/* <div className={styles.col}> */}
        <EthereumOffchainSignWidget />
        {/*   <SignWidget */}
        {/*     chain="Ethereum" */}
        {/*     chainIcon={<EthereumIcon />} */}
        {/*     signType="onchain" */}
        {/*     signButtonOnClick={() => {}} */}
        {/*   /> */}
        {/*   <DocsWidget /> */}
        {/* </div> */}
        {/* <div className={styles.col}> */}
        {/*   <CosmosOffChainSignWidget /> */}
        {/*   <CosmosOnchainSignWidget /> */}
        {/* </div> */}
      </div>
    </div>
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
