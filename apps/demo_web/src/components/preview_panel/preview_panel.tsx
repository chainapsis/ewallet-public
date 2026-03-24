"use client";

import { ContractEditIcon } from "@oko-wallet/oko-common-ui/icons/contract_edit";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import cn from "classnames";
import type { FC } from "react";

import styles from "./preview_panel.module.scss";
import { AccountWidget } from "@oko-wallet-demo-web/components/widgets/account_widget/account_widget";
import { AddressWidget } from "@oko-wallet-demo-web/components/widgets/address_widget/address_widget";
import { CosmosOffChainSignWidget } from "@oko-wallet-demo-web/components/widgets/cosmos_offchain_sign_widget/cosmos_offchain_sign_widget";
import { CosmosOnchainSignWidget } from "@oko-wallet-demo-web/components/widgets/cosmos_onchain_sign_widget/cosmos_onchain_sign_widget";
import { DocsWidget } from "@oko-wallet-demo-web/components/widgets/docs_widget/docs_widget";
import { EthereumOffchainSignWidget } from "@oko-wallet-demo-web/components/widgets/ethereum_offchain_sign_widget/ethereum_offchain_sign_widget";
import { EthereumOnchainSignWidget } from "@oko-wallet-demo-web/components/widgets/ethereum_onchain_sign_widget/ethereum_onchain_sign_widget";
import { ManageCard } from "@oko-wallet-demo-web/components/widgets/manage_card/manage_card";
import { SignInfoBox } from "@oko-wallet-demo-web/components/widgets/sign_info_box/sign_info_box";
import { SolanaOffchainSignWidget } from "@oko-wallet-demo-web/components/widgets/solana_offchain_sign_widget/solana_offchain_sign_widget";
import { SolanaOnchainSignWidget } from "@oko-wallet-demo-web/components/widgets/solana_onchain_sign_widget/solana_onchain_sign_widget";
import { Widget } from "@oko-wallet-demo-web/components/widgets/widget_components";
import { useUserInfoState } from "@oko-wallet-demo-web/state/user_info";

export const PreviewPanel: FC = () => {
  const { isReady: isCosmosReady } = useOkoCosmos();
  const { isReady: isEthReady } = useOkoEth();
  const { isReady: isSvmReady } = useOkoSvm();
  const isLazyInitialized = isCosmosReady && isEthReady && isSvmReady;

  const isSignedIn = useUserInfoState((state) => state.isSignedIn);

  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <div className={styles.bgDecoration} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bg_eye.png" alt="" />
        </div>
        <div className={cn(styles.content, "common-list-scroll")}>
          {isLazyInitialized ? (
            <>
              <div className={styles.col}>
                <AccountWidget />
                <AddressWidget />
                <ManageCard
                  dashboardUrl="https://dapp.oko.app"
                  homeUrl="https://home.oko.app"
                />
                {isSignedIn && <DocsWidget />}
              </div>
              {isSignedIn ? (
                <div className={styles.signingSection}>
                  <div className={styles.signingHeader}>
                    <ContractEditIcon
                      className={styles.signingHeaderIcon}
                      color="#ED6B25"
                      size={20}
                    />
                    <span className={styles.signingHeaderTitle}>
                      Signing Experience
                    </span>
                  </div>
                  <div className={styles.signingSections}>
                    <div className={styles.signingCol}>
                      <Widget>
                        <div className={styles.signContainerCard}>
                          <Typography
                            size="md"
                            weight="semibold"
                            color="primary"
                          >
                            Offchain Message Signing
                          </Typography>
                          <Spacing height={12} />
                          <div className={styles.signList}>
                            <EthereumOffchainSignWidget />
                            <CosmosOffChainSignWidget />
                            <SolanaOffchainSignWidget />
                          </div>
                          <Spacing height={24} />
                          <SignInfoBox
                            title="Why use offchain signatures?"
                            items={[
                              "Prove wallet ownership",
                              "Authenticate without gas fees",
                              "No transaction is sent on-chain",
                            ]}
                          />
                        </div>
                      </Widget>
                    </div>
                    <div className={styles.signingCol}>
                      <Widget>
                        <div className={styles.signContainerCard}>
                          <Typography
                            size="md"
                            weight="semibold"
                            color="primary"
                          >
                            Onchain Transaction Signing
                          </Typography>
                          <Spacing height={12} />
                          <div className={styles.signList}>
                            <EthereumOnchainSignWidget />
                            <CosmosOnchainSignWidget />
                            <SolanaOnchainSignWidget />
                          </div>
                          <Spacing height={24} />
                          <p className={styles.onchainDisclaimer}>
                            {"This is a demo ✨"}
                            <br />
                            {"No transaction will be sent on-chain."}
                          </p>
                        </div>
                      </Widget>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.docsStandalone}>
                  <DocsWidget />
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
