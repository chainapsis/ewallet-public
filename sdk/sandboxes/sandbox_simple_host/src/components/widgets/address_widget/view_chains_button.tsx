import React from "react";

import styles from "./view_chains_button.module.scss";

export const ViewChainsButton: React.FC<ViewChainsButtonProps> = ({
  onClick,
}) => {
  return (
    <div className={styles.button} onClick={onClick}>
      <div className={styles.icons}></div>
      <p>View Supported Chains</p>
    </div>
  );
};

export interface ViewChainsButtonProps {
  onClick?: () => void;
}
