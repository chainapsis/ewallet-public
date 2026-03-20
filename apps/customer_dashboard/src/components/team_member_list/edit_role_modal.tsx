"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { type FC, useRef, useState } from "react";

import styles from "./invite_modal.module.scss";
import type { TeamMember } from "./mock_data";

interface EditRoleModalProps {
  member: TeamMember;
  onUpdate: (role: "Admin" | "Member") => void;
  onClose: () => void;
}

const ShieldTickIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M7.08 10L9.17 12.08 12.92 8.33M10 1.67l-6.67 3v4.67c0 4.2 2.85 8.12 6.67 9.17 3.82-1.05 6.67-4.97 6.67-9.17V4.67L10 1.67Z"
      stroke="var(--fg-primary)"
      strokeWidth="1.67"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M16.67 17.5c0-1.39 0-2.08-.27-2.63a2.5 2.5 0 0 0-1.09-1.1c-.55-.27-1.24-.27-2.63-.27H7.33c-1.39 0-2.08 0-2.63.27a2.5 2.5 0 0 0-1.1 1.1c-.27.55-.27 1.24-.27 2.63M13.33 6.25a3.33 3.33 0 1 1-6.66 0 3.33 3.33 0 0 1 6.66 0Z"
      stroke="var(--fg-primary)"
      strokeWidth="1.67"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UserEditIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 15.5H7.5c-1.4 0-2.1 0-2.6.27a2.5 2.5 0 0 0-1.1 1.1C3.5 17.4 3.5 18.1 3.5 19.5M19 19.5l2-2m-3 1l2.586-2.586a1 1 0 0 0 0-1.414l-.172-.172a1 1 0 0 0-1.414 0L16 16.914V19.5h2ZM14.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
      stroke="var(--fg-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const EditRoleModal: FC<EditRoleModalProps> = ({
  member,
  onUpdate,
  onClose,
}) => {
  const [role, setRole] = useState<"Admin" | "Member">(member.role);
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

        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <UserEditIcon />
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Edit Role
            </Typography>
            <Typography size="sm" weight="regular" color="tertiary">
              Update this member's role.
            </Typography>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.memberInfo}>
            <div className={styles.memberAvatar}>{initial}</div>
            <Typography size="sm" weight="medium" color="primary">
              {member.email}
            </Typography>
          </div>

          <div className={styles.radioGroup}>
            <button
              type="button"
              className={cn(styles.radioItem, {
                [styles.radioItemSelected]: role === "Admin",
              })}
              onClick={() => setRole("Admin")}
            >
              <div className={styles.radioContent}>
                <div className={styles.radioIcon}>
                  <ShieldTickIcon />
                </div>
                <div className={styles.radioText}>
                  <Typography size="md" weight="medium" color="secondary">
                    Admin
                  </Typography>
                  <Typography size="md" weight="regular" color="tertiary">
                    Full control over the Team
                  </Typography>
                </div>
              </div>
              <span
                className={cn(styles.radio, {
                  [styles.radioChecked]: role === "Admin",
                })}
              />
            </button>

            <button
              type="button"
              className={cn(styles.radioItem, {
                [styles.radioItemSelected]: role === "Member",
              })}
              onClick={() => setRole("Member")}
            >
              <div className={styles.radioContent}>
                <div className={styles.radioIcon}>
                  <UserIcon />
                </div>
                <div className={styles.radioText}>
                  <Typography size="md" weight="medium" color="secondary">
                    Member
                  </Typography>
                  <Typography size="md" weight="regular" color="tertiary">
                    Full access, but limited control
                  </Typography>
                </div>
              </div>
              <span
                className={cn(styles.radio, {
                  [styles.radioChecked]: role === "Member",
                })}
              />
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => onUpdate(role)}
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  );
};
