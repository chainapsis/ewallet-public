"use client";

import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { Toast } from "@oko-wallet/oko-common-ui/toast";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useState } from "react";

import styles from "./auto_enable_toast.module.scss";
import type { TokenScanResult } from "@oko-wallet-user-dashboard/workers/token-scan-types";

interface AutoEnableToastProps {
  results: TokenScanResult[];
  onClose: () => void;
}

export const AutoEnableToast: FC<AutoEnableToastProps> = ({
  results,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Toast.Container className={styles.container}>
      <div className={styles.content}>
        <div
          className={styles.header}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <Toast.Icon variant="success" />
          <Typography
            size="sm"
            weight="semibold"
            color="primary"
            className={styles.title}
          >
            Auto Enabled {results.length} Chains
          </Typography>
          <div className={styles.headerRight}>
            <div className={styles.chainIcons}>
              {results.slice(0, 3).map((r) => (
                <img
                  key={r.chainId}
                  src={r.chainImageUrl}
                  alt={r.chainName}
                  className={styles.chainIcon}
                />
              ))}
              {results.length > 3 && (
                <span className={styles.chainIconMore}>
                  +{results.length - 3}
                </span>
              )}
            </div>
            <ChevronDownIcon
              size={20}
              color="var(--fg-quaternary)"
              className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`}
            />
          </div>
        </div>

        <div className={styles.collapseWrapper} data-expanded={isExpanded}>
          <div className={styles.collapseContent}>
            <div className={styles.chainList}>
              {results.map((r) => (
                <div key={r.chainId} className={styles.chainListItem}>
                  {r.chainImageUrl ? (
                    <img
                      src={r.chainImageUrl}
                      alt={r.chainName}
                      className={styles.chainListIcon}
                    />
                  ) : (
                    <div className={styles.chainListIcon} />
                  )}
                  <Typography size="sm" weight="medium" color="tertiary">
                    {r.chainName}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Toast.CloseButton onClose={onClose} />
    </Toast.Container>
  );
};
