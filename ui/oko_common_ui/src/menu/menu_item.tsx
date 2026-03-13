"use client";

import cn from "classnames";
import Link from "next/link";
import type { FC, ReactNode } from "react";

import styles from "./menu_item.module.scss";
import { Typography } from "@oko-wallet-common-ui/typography/typography";

export type MenuItemProps = {
  Icon: ReactNode;
  active: boolean;
  label: string;
  href: string;
};

export const MenuItem: FC<MenuItemProps> = ({
  label,
  Icon,
  active = false,
  href,
}) => {
  return (
    <Link href={href}>
      <li className={cn(styles.wrapper, { [styles.active]: active })}>
        {Icon}
        <Typography
          size="md"
          weight="semibold"
          color={active ? "secondary" : "secondary-hover"}
        >
          {label}
        </Typography>
      </li>
    </Link>
  );
};
