"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useRef } from "react";

import { IconPattern } from "./icon_pattern";
import inviteStyles from "./invite_modal.module.scss";
import styles from "./leave_team_modal.module.scss";
import type { TeamMember } from "./mock_data";

interface ResendInviteModalProps {
  member: TeamMember;
  onResend: () => void;
  onClose: () => void;
}

const SendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M10.5 13.5L21 3M10.71 13.93L13.71 21.43c.21.5.31.74.45.82a.5.5 0 0 0 .44.01c.14-.06.2-.31.31-.8L21.56 5.12c.1-.43.15-.64.1-.79a.5.5 0 0 0-.29-.29c-.15-.05-.36 0-.79.1L2.24 10.49c-.49.11-.74.17-.8.31a.5.5 0 0 0 .01.44c.08.14.32.24.82.45l7.5 3.12c.1.04.15.06.19.1.04.03.07.06.1.19Z"
      stroke="var(--fg-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ResendInviteModal: FC<ResendInviteModalProps> = ({
  member,
  onResend,
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
              <SendIcon />
            </div>
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Re-send the invitation
            </Typography>
            <Typography size="sm" weight="regular" color="tertiary">
              Resend available every 5 minutes.
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
            Cancel
          </Button>
          <Button variant="primary" size="md" fullWidth onClick={onResend}>
            Resend
          </Button>
        </div>
      </div>
    </div>
  );
};
