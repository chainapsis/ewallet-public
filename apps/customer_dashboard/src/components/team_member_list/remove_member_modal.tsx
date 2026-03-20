"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useRef } from "react";

import { IconPattern } from "./icon_pattern";
import inviteStyles from "./invite_modal.module.scss";
import styles from "./leave_team_modal.module.scss";
import type { TeamMember } from "./mock_data";

interface RemoveMemberModalProps {
  member: TeamMember;
  onRemove: () => void;
  onClose: () => void;
}

const UserXIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M16.5 16L21.5 21M21.5 16L16.5 21M12 15.5H7.5c-1.4 0-2.1 0-2.6.27a2.5 2.5 0 0 0-1.1 1.1C3.5 17.4 3.5 18.1 3.5 19.5M14.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
      stroke="var(--fg-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const RemoveMemberModal: FC<RemoveMemberModalProps> = ({
  member,
  onRemove,
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
              <UserXIcon />
            </div>
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Remove User
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
            Cancel
          </Button>
          <Button variant="primary" size="md" fullWidth onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
};
