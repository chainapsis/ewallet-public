import cn from "classnames";
import type { FC } from "react";

import styles from "./nav_item.module.scss";

export interface NavItemProps {
  onClick?: () => void;
  kind?: "trigger" | "menu";
  active?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isParent?: boolean;
}

export const NavItem: FC<NavItemProps> = ({
  onClick,
  kind = "menu",
  active = false,
  icon,
  children,
  isParent,
}) => (
  <div
    className={cn(styles.wrapper, styles[kind], {
      [styles.active]: active,
      [styles.isParent]: !!isParent,
    })}
    onClick={onClick}
    tabIndex={0}
    role={isParent ? "none" : "button"}
  >
    <div className={styles.content}>
      {icon}
      <span className={styles.text}>{children}</span>
    </div>
  </div>
);
