import { Logo } from "@oko-wallet/oko-common-ui/logo";
import type { FC } from "react";

import styles from "./login_header.module.scss";

export const LoginHeader: FC = () => {
  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <Logo theme={"light"} />
        <p className={styles.headerContentText}>Admin</p>
      </div>
    </div>
  );
};
