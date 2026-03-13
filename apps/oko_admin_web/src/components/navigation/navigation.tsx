"use client";

import { usePathname, useRouter } from "next/navigation";
import type { FC } from "react";

import { NavItem } from "./nav_item";
import { navigationItems } from "./nav_items";
import { NavMenu } from "./nav_menu";
import styles from "./navigation.module.scss";

export interface NavigationItem {
  label: string;
  route: string;
  icon?: React.ReactNode;
  subItems?: Array<{ label: string; route: string }>;
}

// biome-ignore lint/complexity/noBannedTypes: empty props type used as component interface
export type NavigationProps = {};

export const Navigation: FC<NavigationProps> = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className={styles.wrapper}>
      {navigationItems.map((item) => {
        if (item.subItems && item.subItems.length > 0) {
          return (
            // has sub items
            <div key={item.route}>
              <NavItem kind="trigger" icon={item.icon} isParent>
                {item.label}
              </NavItem>
              <NavMenu>
                {item.subItems.map((subItem) => (
                  <NavItem
                    key={subItem.route}
                    onClick={() => router.push(subItem.route)}
                    active={pathname === subItem.route}
                    isParent={false}
                  >
                    {subItem.label}
                  </NavItem>
                ))}
              </NavMenu>
            </div>
          );
        } else {
          // no sub items
          return (
            <NavItem
              key={item.route}
              kind="trigger"
              onClick={() => router.push(item.route)}
              icon={item.icon}
              active={pathname === item.route}
            >
              {item.label}
            </NavItem>
          );
        }
      })}
    </div>
  );
};
