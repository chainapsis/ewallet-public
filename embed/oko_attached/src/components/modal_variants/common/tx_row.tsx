import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./tx_row.module.scss";

export interface TxRowProps {
  label?: string;
  children: React.ReactNode;
}

export const TxRow: FC<TxRowProps> = ({ label, children }) => {
  return (
    <div className={styles.txRow}>
      {label ? (
        <Typography color="tertiary" size="xs" weight="medium">
          {label}
        </Typography>
      ) : null}
      {children}
    </div>
  );
};
