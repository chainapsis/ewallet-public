"use client";

import { MenuIcon } from "@oko-wallet/oko-common-ui/icons/menu";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Logo } from "@oko-wallet/oko-common-ui/logo";
import type { FC } from "react";

import styles from "./global_header.module.scss";
import { useThemeState } from "@oko-wallet-demo-web/state/theme";
import { useViewState } from "@oko-wallet-demo-web/state/view";

export const GlobalHeader: FC = () => {
  const isLeftBarOpen = useViewState((state) => state.isLeftBarOpen);
  const toggleLeftBarOpen = useViewState((state) => state.toggleLeftBarOpen);
  const theme = useThemeState((state) => state.theme);

  return (
    <div className={styles.wrapper}>
      <span className={styles.menuIconWrapper} onClick={toggleLeftBarOpen}>
        {isLeftBarOpen ? (
          <XCloseIcon color="var(--fg-primary)" size={24} />
        ) : (
          <MenuIcon color="var(--fg-primary)" size={24} />
        )}
      </span>
      <a href="/" className={styles.logoLink}>
        <Logo className={styles.logoResponsive} theme={theme} />
      </a>
    </div>
  );
};
