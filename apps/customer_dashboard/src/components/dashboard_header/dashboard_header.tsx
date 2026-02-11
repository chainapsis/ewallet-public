import { Logo } from "@oko-wallet/oko-common-ui/logo";
import type { FC } from "react";

import styles from "./dashboard_header.module.scss";

export const DashboardHeader: FC = () => {
  return (
    <div className={styles.wrapper}>
      {/* NOTE: theme is hardcoded to light for now */}
      <Logo />
    </div>
  );
};
