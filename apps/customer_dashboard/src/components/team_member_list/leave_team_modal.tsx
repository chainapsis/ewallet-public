"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { DoorOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/door_outlined";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useRef } from "react";

import styles from "./leave_team_modal.module.scss";

interface LeaveTeamModalProps {
  onLeave: () => void;
  onClose: () => void;
}

export const LeaveTeamModal: FC<LeaveTeamModalProps> = ({
  onLeave,
  onClose,
}) => {
  const mouseDownOnOverlay = useRef(false);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        mouseDownOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownOnOverlay.current) {
          onClose();
        }
        mouseDownOnOverlay.current = false;
      }}
    >
      <div className={styles.modal}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          <XCloseIcon color="var(--fg-quaternary)" size={24} />
        </button>

        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <DoorOutlinedIcon color="var(--fg-primary)" />
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Are you sure you want to leave?
            </Typography>
            <Typography size="sm" weight="regular" color="tertiary">
              Once you leave, you won't be able to access this team anymore.
              You'll need a new invite from an admin to rejoin.
            </Typography>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" fullWidth onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
};
