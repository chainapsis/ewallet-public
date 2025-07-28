import styles from "./page.module.scss";
import { GlobalHeader } from "@keplr-ewallet-demo-web/components/global_header/global_header";
import { LeftBar } from "@keplr-ewallet-demo-web/components/left_bar/left_bar";
import { PreviewPanel } from "@keplr-ewallet-demo-web/components/preview_panel/preview_panel";
import { KeplrEwalletProvider } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";

export default function Home() {
  return (
    <KeplrEwalletProvider initialLoginMethods={["email", "google"]}>
      <div className={styles.wrapper}>
        <GlobalHeader />
        <div className={styles.body}>
          <LeftBar />
          <PreviewPanel />
        </div>
      </div>
    </KeplrEwalletProvider>
  );
}
