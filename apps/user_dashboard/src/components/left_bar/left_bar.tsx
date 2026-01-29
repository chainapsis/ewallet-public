"use client";

import { MenuItem } from "@oko-wallet/oko-common-ui/menu";
import cn from "classnames";
import { usePathname } from "next/navigation";
import type { FC } from "react";

import { AccountInfoWithSubMenu } from "../account_info_with_sub_menu/account_info_with_sub_menu";
import { ExternalLinkItem } from "../external_link_item/external_link_item";
import { navigationItems } from "./constant";
import styles from "./left_bar.module.scss";
import {
  OKO_FEATURE_REQUEST_ENDPOINT,
  OKO_GET_SUPPORT_ENDPOINT,
} from "@oko-wallet-user-dashboard/fetch";
import { useViewState } from "@oko-wallet-user-dashboard/state/view";

export const LeftBar: FC = () => {
  const isLeftBarOpen = useViewState((state) => state.isLeftBarOpen);
  const toggleLeftBarOpen = useViewState((state) => state.toggleLeftBarOpen);
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(styles.overlay, { [styles.isOpen]: isLeftBarOpen })}
        onClick={toggleLeftBarOpen}
      />

      <div className={cn(styles.wrapper, { [styles.isOpen]: isLeftBarOpen })}>
        <ul className={styles.mainMenu}>
          {navigationItems.map((item) => (
            <MenuItem
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              active={pathname === item.href}
            />
          ))}
        </ul>

        <div className={styles.subMenu}>
          <AccountInfoWithSubMenu />

          <div>
            <ExternalLinkItem href={OKO_FEATURE_REQUEST_ENDPOINT}>
              Feature Request
            </ExternalLinkItem>

            <ExternalLinkItem href={OKO_GET_SUPPORT_ENDPOINT}>
              Get Support
            </ExternalLinkItem>
          </div>
        </div>
      </div>
    </>
  );
};
