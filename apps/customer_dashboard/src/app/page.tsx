import styles from "./page.module.scss";
import { Spacing } from "@oko-wallet-common-ui/spacing/spacing";
import { AccountInfo } from "@oko-wallet-ct-dashboard/components/account_info/account_info";
// import { SDKInstallationGuide } from "@oko-wallet-ct-dashboard/components/sdk_installation_guide/sdk_installation_guide";
import { APIKeyList } from "@oko-wallet-ct-dashboard/components/api_key_list/api_key_list";
import { Authorized } from "@oko-wallet-ct-dashboard/components/authorized/authorized";
import { DashboardBody } from "@oko-wallet-ct-dashboard/components/dashboard_body/dashboard_body";
import { DashboardHeader } from "@oko-wallet-ct-dashboard/components/dashboard_header/dashboard_header";
import { DesignSection } from "@oko-wallet-ct-dashboard/components/design_section/design_section";
import { HomeBanner } from "@oko-wallet-ct-dashboard/components/home_banner/home_banner";
import { LeftBar } from "@oko-wallet-ct-dashboard/components/left_bar/left_bar";
import { ToastContainer } from "@oko-wallet-ct-dashboard/components/toast";

export default function Home() {
  return (
    <Authorized>
      <div className={styles.wrapper}>
        <DashboardHeader />
        <div className={styles.body}>
          <LeftBar />
          <DashboardBody>
            <AccountInfo />
            <div className={styles.homeBanners}>
              <HomeBanner
                title="Read our docs"
                description="Everything you need to get started with Oko."
                buttonText="Open docs"
                buttonLink={process.env.NEXT_PUBLIC_OKO_DOCS_ENDPOINT}
                type="docs"
              />
              <HomeBanner
                title="See it in action"
                description="Try and explore Oko in a live demo."
                buttonText="Try Demo"
                buttonLink={process.env.NEXT_PUBLIC_OKO_DEMO_ENDPOINT}
                type="demo"
              />
            </div>
            {/* TODO: @Ryz0nd, @lidarbtc */}
            {/* <SDKInstallationGuide /> */}
            <APIKeyList />
            <Spacing height={66} />
            <DesignSection />
            <ToastContainer />
          </DashboardBody>
        </div>
      </div>
    </Authorized>
  );
}
