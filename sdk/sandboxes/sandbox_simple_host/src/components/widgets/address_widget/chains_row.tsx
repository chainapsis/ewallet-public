import React, { type ReactElement } from "react";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import styles from "./chains_row.module.scss";

export interface ChainsRowProps {
  chainName: string;
  icon: ReactElement;
}

export const ChainsRow: React.FC<ChainsRowProps> = ({ chainName, icon }) => {
  return (
    <div className={styles.row}>
      {icon}
      <Typography tagType="span" size="md" weight="medium" color="secondary">
        {chainName}
      </Typography>
    </div>
  );
};
