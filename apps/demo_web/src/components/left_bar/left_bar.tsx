"use client";

import { HomeOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/home_outlined";
import { MenuItem } from "@oko-wallet/oko-common-ui/menu";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import cn from "classnames";
import type { FC } from "react";

import { IntegrationCard } from "./integration_card/integration_card";
import styles from "./left_bar.module.scss";
import { ThemeButton } from "@oko-wallet-demo-web/components/theme/theme_button";
import { useViewState } from "@oko-wallet-demo-web/state/view";

export const LeftBar: FC = () => {
  const isLeftBarOpen = useViewState((state) => state.isLeftBarOpen);
  const toggleLeftBarOpen = useViewState((state) => state.toggleLeftBarOpen);
  const showIntegrationCard = useViewState(
    (state) => state.showIntegrationCard,
  );
  const hideIntegrationCard = useViewState(
    (state) => state.hideIntegrationCard,
  );

  return (
    <>
      <div
        className={cn(styles.overlay, { [styles.isOpen]: isLeftBarOpen })}
        onClick={toggleLeftBarOpen}
      />
      <ul className={cn(styles.wrapper, { [styles.isOpen]: isLeftBarOpen })}>
        <MenuItem
          href="/"
          label="Home"
          Icon={
            <HomeOutlinedIcon color="var(--gray-400)" className={styles.icon} />
          }
          active={true}
        />
        <div>
          {showIntegrationCard && (
            <>
              <IntegrationCard onClose={hideIntegrationCard} />
              <Spacing height={16} />
            </>
          )}

          <ThemeButton />
        </div>
      </ul>
    </>
  );
};
