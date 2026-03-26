"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useRef } from "react";

import { IconPattern } from "./icon_pattern";
import inviteStyles from "./invite_modal.module.scss";
import styles from "./leave_team_modal.module.scss";
import type { TeamListItem } from "./types";

interface CancelInviteModalProps {
  member: TeamListItem;
  onCancelInvite: () => void;
  onClose: () => void;
}

const XCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M15 9L9 15M9 9L15 15M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
      stroke="var(--fg-secondary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CancelInviteModal: FC<CancelInviteModalProps> = ({
  member,
  onCancelInvite,
  onClose,
}) => {
  const mouseDownOnOverlay = useRef(false);
  const initial = member.email.charAt(0).toUpperCase();

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
          <div className={styles.iconContainer}>
            <IconPattern className={styles.iconPattern} />
            <div className={styles.iconWrapper}>
              <XCircleIcon />
            </div>
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Cancel Invitation
            </Typography>
            <Typography size="sm" weight="regular" color="tertiary">
              Are you sure? This cannot be undone.
            </Typography>
          </div>
        </div>

        <div className={styles.body}>
          <div className={inviteStyles.memberInfo}>
            <div className={inviteStyles.memberAvatar}>{initial}</div>
            <Typography size="sm" weight="medium" color="primary">
              {member.email}
            </Typography>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Keep Invite
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={onCancelInvite}
          >
            Cancel Invite
          </Button>
        </div>
      </div>
    </div>
  );
};
