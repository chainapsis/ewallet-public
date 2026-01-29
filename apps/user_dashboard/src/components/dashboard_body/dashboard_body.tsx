import cn from "classnames";
import type { FC, PropsWithChildren } from "react";

import styles from "./dashboard_body.module.scss";

export const DashboardBody: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className={styles.wrapper}>
      <div className={cn(styles.inner, "hide-scrollbar")}>{children}</div>
    </div>
  );
};
