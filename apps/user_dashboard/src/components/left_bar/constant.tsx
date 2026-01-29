import { FileIcon } from "@oko-wallet/oko-common-ui/icons/file_icon";
import { HomeOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/home_outlined";
import type React from "react";

import styles from "./left_bar.module.scss";
import { paths } from "@oko-wallet-user-dashboard/paths";

export interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export const navigationItems: NavigationItem[] = [
  {
    label: "Home",
    href: paths.home,
    icon: <HomeOutlinedIcon color="var(--gray-400)" className={styles.icon} />,
  },
  {
    label: "Transaction History",
    href: paths.transaction_history,
    icon: <FileIcon color="var(--gray-400)" className={styles.icon} />,
  },
];
