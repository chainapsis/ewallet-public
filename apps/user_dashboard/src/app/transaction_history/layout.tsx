import type { ReactNode } from "react";

import "@oko-wallet/oko-common-ui/styles/colors.scss";
import "@oko-wallet/oko-common-ui/styles/typography.scss";
import "@oko-wallet/oko-common-ui/styles/shadow.scss";

import { Authorized } from "@oko-wallet-user-dashboard/components/authorized/authorized";
import { DashboardBody } from "@oko-wallet-user-dashboard/components/dashboard_body/dashboard_body";
import { DashboardHeader } from "@oko-wallet-user-dashboard/components/dashboard_header/dashboard_header";
import { LeftBar } from "@oko-wallet-user-dashboard/components/left_bar/left_bar";
import styles from "@oko-wallet-user-dashboard/styles/layout_with_left_bar.module.scss";

export default function TransactionHistoryLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Authorized>
      <div className={styles.wrapper}>
        <DashboardHeader />
        <div className={styles.body}>
          <LeftBar />
          <DashboardBody>
            <div className={styles.content}>{children}</div>
          </DashboardBody>
        </div>
      </div>
    </Authorized>
  );
}
