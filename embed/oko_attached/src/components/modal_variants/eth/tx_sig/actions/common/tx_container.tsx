import type { FC, ReactNode } from "react";

import styles from "./tx_container.module.scss";

export interface TxContainerProps {
  children: ReactNode;
}

export const TxContainer: FC<TxContainerProps> = ({ children }) => {
  return <div className={styles.txContainer}>{children}</div>;
};
