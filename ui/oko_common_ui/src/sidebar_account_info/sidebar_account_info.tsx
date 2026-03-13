"use client";

import cn from "classnames";
import type { FC, ReactNode } from "react";

import styles from "./sidebar_account_info.module.scss";
import { Typography } from "@oko-wallet-common-ui/typography/typography";

export type SidebarAccountInfoProps = {
  className?: string;
  TopRightIcon?: ReactNode;
  email: string;
  label: string;
  logoImageUrl?: string;
};

export const SidebarAccountInfo: FC<SidebarAccountInfoProps> = ({
  className,
  TopRightIcon = null,
  email,
  label,
  logoImageUrl,
}) => {
  return (
    <div className={cn(styles.wrapper, className)}>
      {logoImageUrl ? (
        <img src={logoImageUrl} alt="avatar" />
      ) : (
        <Typography
          size="md"
          weight="semibold"
          color="quaternary"
          className={styles.fallbackImageText}
        >
          {label.slice(0, 2).toUpperCase()}
        </Typography>
      )}

      <div className={styles.detailInfo}>
        {TopRightIcon && (
          <span className={styles.topRightIcon}>{TopRightIcon}</span>
        )}
        <Typography
          size="sm"
          weight="semibold"
          color="primary"
          className={cn(
            styles.label,
            TopRightIcon ? styles.labelWithIcon : undefined,
          )}
        >
          {label}
        </Typography>
        <Typography size="sm" color="tertiary" className={styles.userEmail}>
          {email}
        </Typography>
      </div>
    </div>
  );
};
