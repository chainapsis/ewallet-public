import styles from "./page.module.scss";
import { Authorized } from "@oko-wallet-ct-dashboard/components/authorized/authorized";
import { DashboardBody } from "@oko-wallet-ct-dashboard/components/dashboard_body/dashboard_body";
import { DashboardHeader } from "@oko-wallet-ct-dashboard/components/dashboard_header/dashboard_header";
import { LeftBar } from "@oko-wallet-ct-dashboard/components/left_bar/left_bar";
import { TeamMemberList } from "@oko-wallet-ct-dashboard/components/team_member_list/team_member_list";

export default function TeamPage() {
  return (
    <Authorized>
      <div className={styles.wrapper}>
        <DashboardHeader />
        <div className={styles.body}>
          <LeftBar />
          <DashboardBody>
            <TeamMemberList />
          </DashboardBody>
        </div>
      </div>
    </Authorized>
  );
}
