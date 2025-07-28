import React, { type FC } from "react";
import { Logo } from "@keplr-ewallet/ewallet-common-ui/logo";

import styles from "./global_header.module.scss";

export const GlobalHeader: FC = () => {
  return (
    <div className={styles.wrapper}>
      <Logo />
    </div>
  );
};
