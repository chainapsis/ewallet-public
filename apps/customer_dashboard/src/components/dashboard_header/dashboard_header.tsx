import { Logo } from "@oko-wallet/oko-common-ui/logo";
import Link from "next/link";
import type { FC } from "react";

import styles from "./dashboard_header.module.scss";
import { paths } from "@oko-wallet-ct-dashboard/paths";

export const DashboardHeader: FC = () => {
  return (
    <div className={styles.wrapper}>
      <Link href={paths.home}>
        <Logo theme="light" />
      </Link>
    </div>
  );
};
