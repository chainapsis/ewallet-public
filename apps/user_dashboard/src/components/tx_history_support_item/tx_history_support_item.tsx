"use client";

import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";
import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./tx_history_support_item.module.scss";
import { useChain } from "@oko-wallet-user-dashboard/hooks/queries";

export type TxHistorySupportItemProps = {
  chainId: string;
  explorerName: string;
  explorerUrl: string;
};

export const TxHistorySupportItem: FC<TxHistorySupportItemProps> = ({
  chainId,
  explorerName,
  explorerUrl,
}) => {
  const { chain: chainInfo } = useChain(chainId);

  const chainImage = chainInfo?.chainSymbolImageUrl;
  const chainName = chainInfo?.chainName ?? "Unknown Chain";

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      <span className={styles.chainName}>
        {chainImage ? (
          <img src={chainImage} alt={chainName} width={16} height={16} />
        ) : (
          <EmptyStateIcon size={16} />
        )}
        <Typography size="md" weight="medium" color="secondary">
          {chainName}
        </Typography>
      </span>
      <div className={styles.explorerName}>
        <Typography size="sm" weight="medium" color="secondary">
          {explorerName}
        </Typography>
        <ExternalLinkOutlinedIcon color="var(--fg-tertiary)" size={12} />
      </div>
    </a>
  );
};
