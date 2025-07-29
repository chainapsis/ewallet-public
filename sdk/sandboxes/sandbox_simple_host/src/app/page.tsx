import React from "react";

import styles from "./page.module.scss";
import { KeplrEWalletProvider } from "@/components/keplr_ewallet_provider/keplr_ewallet_provider";
import { PreviewPanel } from "@/components/preview_panel/preview_panel";

export default function Home() {
  return (
    <KeplrEWalletProvider>
      <PreviewPanel />
    </KeplrEWalletProvider>
  );
}
