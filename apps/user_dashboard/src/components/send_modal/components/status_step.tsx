"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "../send_modal.module.scss";
import type { TransactionStatus } from "../types";
import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";
import { getExplorerTxUrl } from "@oko-wallet-user-dashboard/utils/send";

interface StatusStepProps {
  txStatus: TransactionStatus;
  txHash: string | null;
  txError: string | null;
  chainInfo: ModularChainInfo;
  onClose: () => void;
  onRetry: () => void;
}

export const StatusStep: FC<StatusStepProps> = ({
  txStatus,
  txHash,
  txError,
  chainInfo,
  onClose,
  onRetry,
}) => {
  const explorerUrl = txHash ? getExplorerTxUrl(chainInfo, txHash) : null;

  return (
    <div className={styles.statusContainer}>
      {txStatus === "pending" && (
        <>
          <div className={styles.spinner} />
          <Typography size="md" weight="semibold" color="primary">
            Sending Transaction...
          </Typography>
          <Typography size="sm" color="tertiary">
            Please wait while your transaction is being processed
          </Typography>
        </>
      )}

      {txStatus === "success" && (
        <>
          <div className={styles.successIcon}>&#10003;</div>
          <Typography size="md" weight="semibold" color="primary">
            Transaction Sent
          </Typography>
          {txHash && (
            <Typography size="xs" color="tertiary">
              TX: {txHash.slice(0, 12)}...{txHash.slice(-8)}
            </Typography>
          )}
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.txHashLink}
            >
              View on Explorer
            </a>
          )}
          <Button variant="primary" size="md" fullWidth onClick={onClose}>
            Done
          </Button>
        </>
      )}

      {txStatus === "error" && (
        <>
          <div className={styles.errorIcon}>!</div>
          <Typography size="md" weight="semibold" color="primary">
            Transaction Failed
          </Typography>
          {txError && (
            <Typography size="xs" color="tertiary">
              {txError.length > 200 ? `${txError.slice(0, 200)}...` : txError}
            </Typography>
          )}
          <div className={styles.buttonGroup}>
            <Button variant="secondary" size="md" fullWidth onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" size="md" fullWidth onClick={onRetry}>
              Try Again
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
