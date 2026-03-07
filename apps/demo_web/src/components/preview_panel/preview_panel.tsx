"use client";

import { EditIcon } from "@oko-wallet/oko-common-ui/icons/edit";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import cn from "classnames";
import type { FC } from "react";

import styles from "./preview_panel.module.scss";
import { AccountWidget } from "@oko-wallet-demo-web/components/widgets/account_widget/account_widget";
import { AddressWidget } from "@oko-wallet-demo-web/components/widgets/address_widget/address_widget";
import { CosmosOffChainSignWidget } from "@oko-wallet-demo-web/components/widgets/cosmos_offchain_sign_widget/cosmos_offchain_sign_widget";
import { CosmosOnchainSignWidget } from "@oko-wallet-demo-web/components/widgets/cosmos_onchain_sign_widget/cosmos_onchain_sign_widget";
import { DocsWidget } from "@oko-wallet-demo-web/components/widgets/docs_widget/docs_widget";
import { ManageCard } from "@oko-wallet-demo-web/components/widgets/manage_card/manage_card";
import { EthereumOffchainSignWidget } from "@oko-wallet-demo-web/components/widgets/ethereum_offchain_sign_widget/ethereum_offchain_sign_widget";
import { EthereumOnchainSignWidget } from "@oko-wallet-demo-web/components/widgets/ethereum_onchain_sign_widget/ethereum_onchain_sign_widget";
import { SolanaOffchainSignWidget } from "@oko-wallet-demo-web/components/widgets/solana_offchain_sign_widget/solana_offchain_sign_widget";
import { SolanaOnchainSignWidget } from "@oko-wallet-demo-web/components/widgets/solana_onchain_sign_widget/solana_onchain_sign_widget";
import { useSDKState } from "@oko-wallet-demo-web/state/sdk";
import { useUserInfoState } from "@oko-wallet-demo-web/state/user_info";

export const PreviewPanel: FC = () => {
  const isLazyInitialized = useSDKState(
    (st) =>
      st.isCosmosLazyInitialized &&
      st.isEthLazyInitialized &&
      st.isSolLazyInitialized,
  );

  const isSignedIn = useUserInfoState((state) => state.isSignedIn);

  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <div className={cn(styles.content, "common-list-scroll")}>
          {isLazyInitialized ? (
            <>
              <div className={styles.col}>
                <AccountWidget />
                <AddressWidget />
                <ManageCard />
                <DocsWidget />
              </div>
              {isSignedIn && (
                <div className={styles.signingSection}>
                  <div className={styles.signingHeader}>
                    <EditIcon
                      className={styles.signingHeaderIcon}
                      color="var(--text-secondary)"
                      size={20}
                    />
                    <span className={styles.signingHeaderTitle}>
                      Signing Experience
                    </span>
                  </div>
                  <div className={styles.signingSections}>
                    <div className={styles.signingCol}>
                      <EthereumOffchainSignWidget />
                      <CosmosOffChainSignWidget />
                      <SolanaOffchainSignWidget />
                    </div>
                    <div className={styles.signingCol}>
                      <EthereumOnchainSignWidget />
                      <CosmosOnchainSignWidget />
                      <SolanaOnchainSignWidget />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.col}>
              <Skeleton width="358px" height="384px" borderRadius="20px" />
              <Skeleton width="358px" height="192px" borderRadius="20px" />
              <Skeleton width="360px" height="184px" borderRadius="20px" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
