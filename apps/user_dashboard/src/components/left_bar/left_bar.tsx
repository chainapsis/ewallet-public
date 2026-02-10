"use client";

import { MenuItem } from "@oko-wallet/oko-common-ui/menu";
import cn from "classnames";
import { usePathname } from "next/navigation";
import type { FC } from "react";

import { navigationItems } from "./constant";
import styles from "./left_bar.module.scss";
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
      </div>
    </>
  );
};
