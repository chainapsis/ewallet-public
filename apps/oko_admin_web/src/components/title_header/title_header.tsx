import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC, ReactNode } from "react";

import styles from "./title_header.module.scss";

interface TitleHeaderProps {
  title: string;
  totalCount?: number;
  verifiedCount?: number;
  txGenCount?: number;
  renderRightContent?: () => ReactNode;
}

export const TitleHeader: FC<TitleHeaderProps> = ({
  title,
  totalCount,
  verifiedCount,
  txGenCount,
  renderRightContent,
}) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.titleSection}>
        <Typography
          color="primary"
          tagType="h1"
          className={styles.title}
          weight="bold"
          size="display-sm"
        >
          {title}
        </Typography>
        {totalCount !== undefined && (
          <div className={styles.countInfo}>
            <span>Total ({totalCount})</span>
            {verifiedCount !== undefined && (
              <>
                <span className={styles.divider}>/</span>
                <span className={styles.verifiedCount}>
                  Verified ({verifiedCount})
                </span>
              </>
            )}
            {txGenCount !== undefined && (
              <>
                <span className={styles.divider}>/</span>
                <span className={styles.txGenCount}>
                  TxActive ({txGenCount})
                </span>
              </>
            )}
          </div>
        )}
      </div>
      {renderRightContent?.()}
    </div>
  );
};
