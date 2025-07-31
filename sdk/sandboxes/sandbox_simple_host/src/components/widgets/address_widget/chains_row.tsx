import React, { type ReactElement } from "react";

import styles from "./chains_row.module.scss";

export interface ChainsRowProps {
  chainName: string;
  icon: ReactElement;
}

export const ChainsRow: React.FC<ChainsRowProps> = ({ chainName, icon }) => {
  return (
    <div className={styles.row}>
      {icon}
      <p>{chainName}</p>
    </div>
  );
};
