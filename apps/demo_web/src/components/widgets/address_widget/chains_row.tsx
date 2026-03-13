import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC, ReactElement } from "react";

import styles from "./chains_row.module.scss";

export interface ChainsRowProps {
  chainName: string;
  icon: ReactElement;
}

export const ChainsRow: FC<ChainsRowProps> = ({ chainName, icon }) => {
  return (
    <div className={styles.row}>
      {icon}
      <Typography tagType="span" size="md" weight="medium" color="secondary">
        {chainName}
      </Typography>
    </div>
  );
};
