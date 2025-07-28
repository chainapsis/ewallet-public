import React, { type ReactElement } from "react";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import styles from "./wallet_box.module.scss";

export const WalletBox: React.FC<WalletBoxProps> = ({ icon, label }) => {
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
