import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC, ReactElement } from "react";

import styles from "./wallet_box.module.scss";

export const WalletBox: FC<WalletBoxProps> = ({ icon, label }) => {
  return (
    <div className={styles.boxContainer}>
      {icon}
      <Typography tagType="span" size="md" weight="medium" color="secondary">
        {label}
      </Typography>
    </div>
  );
};

export interface WalletBoxProps {
  icon: ReactElement;
  label: string;
}
