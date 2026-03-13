import type React from "react";

import { SideBar } from "@oko-wallet-admin/components/side_bar/side_bar";
import styles from "@oko-wallet-admin/styles/layout_with_side_bar.module.scss";

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.wrapper}>
      <SideBar />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
