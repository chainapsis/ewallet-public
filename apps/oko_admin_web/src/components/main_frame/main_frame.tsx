import type React from "react";

import styles from "./main_frame.module.scss";

export const MainFrame = ({ children }: { children: React.ReactNode }) => {
  return <div className={styles.wrapper}>{children}</div>;
};
