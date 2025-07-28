import React from "react";
import { CosmosIcon } from "@keplr-ewallet/ewallet-common-ui/icons/cosmos_icon";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import styles from "./view_chains_button.module.scss";

export const ViewChainsButton: React.FC<ViewChainsButtonProps> = ({
  onClick,
}) => {
  return (
    <div className={styles.button} onClick={onClick}>
      <div className={styles.icons}>
        <CosmosIcon />
        <CosmosIcon />
        <CosmosIcon />
      </div>
      <Typography tagType="span" size="md" weight="semibold" color="secondary">
        View Supported Chains
      </Typography>
    </div>
  );
};

export interface ViewChainsButtonProps {
  onClick?: () => void;
}
