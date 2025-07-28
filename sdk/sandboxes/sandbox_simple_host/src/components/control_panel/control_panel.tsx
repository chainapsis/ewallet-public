"use client";

import React from "react";

import styles from "./control_panel.module.scss";
import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";
import { SettingPanel } from "./setting_panel";
import { ConsolePanel } from "./console_panel";

export const ControlPanel = () => {
  const { isAuthenticated } = useKeplrEwallet();

  return (
    <div className={styles.wrapper}>
      {isAuthenticated ? <ConsolePanel /> : <SettingPanel />}
    </div>
  );
};
