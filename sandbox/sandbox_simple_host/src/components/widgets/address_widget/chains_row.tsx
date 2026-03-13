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
      <p>{chainName}</p>
    </div>
  );
};
