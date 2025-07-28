import React from "react";
import { XCloseIcon } from "@keplr-ewallet/ewallet-common-ui/icons/x_close";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import styles from "./beta_access_card.module.scss";

interface Props {
  onClose: () => void;
}

export const BetaAccessCard: React.FC<Props> = ({ onClose }) => {
  return (
    <div className={styles.container} style={{ position: "relative" }}>
      <div className={styles.titleRow}>
        <Typography size="sm" weight="semibold" color="primary">
          Join the Beta!
        </Typography>
        <button className={styles.closeButton} onClick={onClose}>
          <XCloseIcon />
        </button>
      </div>
      <Typography
        size="sm"
        weight="regular"
        color="tertiary"
        className={styles.description}
      >
        Ready to bring this experience to your dApp? Apply for early access.
      </Typography>

      <div className={styles.videoBox} />

      <Typography
        tagType="a"
        size="sm"
        weight="semibold"
        color="brand-secondary"
        href="https://example.com/early-access"
        target="_blank"
        rel="noopener noreferrer"
      >
        Get Early Access
      </Typography>
    </div>
  );
};
