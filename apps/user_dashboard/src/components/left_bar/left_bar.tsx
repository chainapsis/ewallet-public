"use client";

import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { MenuItem } from "@oko-wallet/oko-common-ui/menu";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { usePathname } from "next/navigation";
import type { FC } from "react";

import { navigationItems } from "./constant";
import styles from "./left_bar.module.scss";
import {
  OKO_FEATURE_REQUEST_ENDPOINT,
  OKO_GET_SUPPORT_ENDPOINT,
} from "@oko-wallet-user-dashboard/fetch";
import { useViewState } from "@oko-wallet-user-dashboard/state/view";

const OKO_LOGO_URL =
  "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/icons/oko_logo.png";

export const LeftBar: FC = () => {
  const isLeftBarOpen = useViewState((state) => state.isLeftBarOpen);
  const toggleLeftBarOpen = useViewState((state) => state.toggleLeftBarOpen);
  const setLeftBarOpen = useViewState((state) => state.setLeftBarOpen);
  const pathname = usePathname();

  const handleClose = () => {
    setLeftBarOpen(false);
  };

  return (
    <>
      <div
        className={cn(styles.overlay, { [styles.isOpen]: isLeftBarOpen })}
        onClick={toggleLeftBarOpen}
      />

      <div className={cn(styles.wrapper, { [styles.isOpen]: isLeftBarOpen })}>
        <div className={styles.header}>
          <img src={OKO_LOGO_URL} alt="Oko" width={72} height={28} />
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
          >
            <XCloseIcon size={24} color="var(--fg-primary)" />
          </button>
        </div>

        <ul className={styles.mainMenu}>
          {navigationItems.map((item) => (
            <MenuItem
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              active={pathname === item.href}
              onClick={handleClose}
            />
          ))}
        </ul>

        <div className={styles.footer}>
          <a
            href={OKO_FEATURE_REQUEST_ENDPOINT}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerItem}
          >
            <Typography size="sm" weight="semibold" color="secondary">
              Feature Request
            </Typography>
            <ExternalLinkOutlinedIcon color="var(--fg-quaternary)" />
          </a>
          <a
            href={OKO_GET_SUPPORT_ENDPOINT}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerItem}
          >
            <Typography size="sm" weight="semibold" color="secondary">
              Get Support
            </Typography>
            <ExternalLinkOutlinedIcon color="var(--fg-quaternary)" />
          </a>
        </div>
      </div>
    </>
  );
};
