import React from "react";

import styles from "./page.module.scss";
import { KeplrEwalletProvider } from "@/contexts/KeplrEwalletProvider";
import { PreviewPanel } from "@/components/preview_panel/preview_panel";

export default function Home() {
  return (
    <KeplrEwalletProvider initialLoginMethods={["email", "google"]}>
      <PreviewPanel />
    </KeplrEwalletProvider>
  );
}
