"use client";

import { MenuIcon } from "@oko-wallet/oko-common-ui/icons/menu";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Logo } from "@oko-wallet/oko-common-ui/logo";
import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import type { Property } from "csstype";
import type { FC } from "react";

import styles from "./dashboard_header.module.scss";
import { useViewState } from "@oko-wallet-user-dashboard/state/view";

export const DashboardHeader: FC<{
  theme?: Theme;
  position?: Property.Position;
}> = ({ theme = "light", position = "static" }) => {
  const isLeftBarOpen = useViewState((state) => state.isLeftBarOpen);
  const toggleLeftBarOpen = useViewState((state) => state.toggleLeftBarOpen);

  return (
    <div className={styles.wrapper} style={{ position }}>
      <Logo theme={theme} />
      <span className={styles.menuIconWrapper} onClick={toggleLeftBarOpen}>
        {isLeftBarOpen ? (
          <XCloseIcon color="var(--fg-primary)" size={24} />
        ) : (
          <MenuIcon color="var(--fg-primary)" size={24} />
        )}
      </span>
    </div>
  );
};
