import type { FC, ReactElement } from "react";

import styles from "./wallet_box.module.scss";

export const WalletBox: FC<WalletBoxProps> = ({ icon, label }) => {
  return (
    <div className={styles.boxContainer}>
      {icon}
      <p>{label}</p>
    </div>
  );
};

export interface WalletBoxProps {
  icon: ReactElement;
  label: string;
}
