"use client";

import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { HomeOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/home_outlined";
import { UsersIcon } from "@oko-wallet/oko-common-ui/icons/users";
import { MenuItem } from "@oko-wallet/oko-common-ui/menu";
import { usePathname } from "next/navigation";
import { type FC, useCallback, useEffect, useState } from "react";

import { AccountInfoWithSubMenu } from "../account_info_with_sub_menu/account_info_with_sub_menu";
import { ExternalLinkItem } from "../external_link_item/external_link_item";
import styles from "./left_bar.module.scss";
import { requestGetTeamMembers } from "@oko-wallet-ct-dashboard/fetch/team";
import { paths } from "@oko-wallet-ct-dashboard/paths";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

export const LeftBar: FC = () => {
  const pathname = usePathname();
  const token = useAppState((s) => s.token);
  const [teamMemberCount, setTeamMemberCount] = useState<number | null>(null);

  const fetchCount = useCallback(async () => {
    if (!token) {
      return;
    }
    const res = await requestGetTeamMembers({ token, limit: 1 });
    if (res.success) {
      setTeamMemberCount(res.data.total + res.data.pending_invitations.length);
    }
  }, [token]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return (
    <div className={styles.wrapper}>
      <ul className={styles.mainMenu}>
        <MenuItem
          href={paths.home}
          label="Home"
          Icon={
            <HomeOutlinedIcon color="var(--gray-400)" className={styles.icon} />
          }
          active={pathname === paths.home}
        />
        <div className={styles.menuItemWithBadge}>
          <MenuItem
            href={paths.team}
            label="Team"
            Icon={<UsersIcon color="var(--gray-400)" className={styles.icon} />}
            active={pathname === paths.team}
          />
          <Badge
            color="gray"
            label={teamMemberCount !== null ? String(teamMemberCount) : "–"}
            size="sm"
          />
        </div>
      </ul>

      <div className={styles.subMenu}>
        <AccountInfoWithSubMenu />

        <div>
          <ExternalLinkItem
            href={process.env.NEXT_PUBLIC_OKO_FEATURE_REQUEST_ENDPOINT}
          >
            Feature Request
          </ExternalLinkItem>

          <ExternalLinkItem
            href={process.env.NEXT_PUBLIC_OKO_GET_SUPPORT_ENDPOINT}
          >
            Get Support
          </ExternalLinkItem>
        </div>
      </div>
    </div>
  );
};
