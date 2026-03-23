"use client";

import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { HomeOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/home_outlined";
import { UsersIcon } from "@oko-wallet/oko-common-ui/icons/users";
import { MenuItem } from "@oko-wallet/oko-common-ui/menu";
import { usePathname } from "next/navigation";
import type { FC } from "react";

import { AccountInfoWithSubMenu } from "../account_info_with_sub_menu/account_info_with_sub_menu";
import { ExternalLinkItem } from "../external_link_item/external_link_item";
import styles from "./left_bar.module.scss";
import { paths } from "@oko-wallet-ct-dashboard/paths";

const MOCK_TEAM_MEMBER_COUNT = 96;

export const LeftBar: FC = () => {
  const pathname = usePathname();

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
            label={String(MOCK_TEAM_MEMBER_COUNT)}
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
