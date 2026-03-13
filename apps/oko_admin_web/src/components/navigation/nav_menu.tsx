import type { FC } from "react";

import styles from "./nav_menu.module.scss";

export const NavMenu: FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className={styles.wrapper}>{children}</div>;
};
