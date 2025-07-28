"use client";

import React from "react";
import { useState } from "react";
import { MenuItem } from "@keplr-ewallet/ewallet-common-ui/menu_item";
import { HomeOutlinedIcon } from "@keplr-ewallet/ewallet-common-ui/icons/home_outlined";

import styles from "./left_bar.module.scss";
import { BetaAccessCard } from "./beta_access_card/beta_access_card";

export const LeftBar = () => {
  const [showBetaCard, setShowBetaCard] = useState(true);

  return (
    <ul className={styles.wrapper}>
      <MenuItem
        href="/"
        label="Home"
        Icon={
          <HomeOutlinedIcon color="var(--gray-400)" className={styles.icon} />
        }
        active={true}
      />
      {showBetaCard && (
        <BetaAccessCard onClose={() => setShowBetaCard(false)} />
      )}
    </ul>
  );
};
