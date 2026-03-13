"use client";

import type { FC } from "react";

import { AppsViewHeader } from "./apps_view_header";
import { CustomerTable } from "./customer_table";
import styles from "./manage_apps.module.scss";

export const AppsView: FC = () => {
  return (
    <div className={styles.wrapper}>
      <AppsViewHeader />
      <CustomerTable />
    </div>
  );
};
