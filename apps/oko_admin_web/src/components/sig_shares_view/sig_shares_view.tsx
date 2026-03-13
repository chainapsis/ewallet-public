"use client";

import type { FC } from "react";

import { SigSharesTable } from "./sig_shares_table";
import styles from "./sig_shares_view.module.scss";
import { TitleHeader } from "@oko-wallet-admin/components/title_header/title_header";

export const SigSharesView: FC = () => {
  return (
    <div className={styles.wrapper}>
      <TitleHeader title="Sig History" />
      <SigSharesTable />
    </div>
  );
};
