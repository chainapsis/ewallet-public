"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { type FC, useRef, useState } from "react";

import { IconPattern } from "./icon_pattern";
import styles from "./invite_modal.module.scss";
import type { TeamListItem } from "./types";

interface EditRoleModalProps {
  member: TeamListItem;
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
      d="M9 15.5H7.5C6.10444 15.5 5.40665 15.5 4.83886 15.6722C3.56045 16.06 2.56004 17.0605 2.17224 18.3389C2 18.9067 2 19.6044 2 21M14.5 7.5C14.5 9.98528 12.4853 12 10 12C7.51472 12 5.5 9.98528 5.5 7.5C5.5 5.01472 7.51472 3 10 3C12.4853 3 14.5 5.01472 14.5 7.5ZM11 21L14.1014 20.1139C14.2499 20.0715 14.3241 20.0502 14.3934 20.0184C14.4549 19.9902 14.5134 19.9558 14.5679 19.9158C14.6293 19.8707 14.6839 19.8161 14.7932 19.7068L21.25 13.25C21.9404 12.5597 21.9404 11.4403 21.25 10.75C20.5597 10.0596 19.4404 10.0596 18.75 10.75L12.2932 17.2068C12.1839 17.3161 12.1293 17.3707 12.0842 17.4321C12.0442 17.4866 12.0098 17.5451 11.9816 17.6066C11.9497 17.6759 11.9285 17.7501 11.8861 17.8987L11 21Z"
      stroke="var(--fg-secondary)"
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
  const currentRole = member.role === "admin" ? "Admin" : "Member";
  const [role, setRole] = useState<"Admin" | "Member">(
    currentRole === "Admin" ? "Member" : "Admin",
  );
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
          <div className={styles.iconContainer}>
            <IconPattern className={styles.iconPattern} />
            <div className={styles.iconWrapper}>
              <UserEditIcon />
            </div>
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Edit Role
            </Typography>
            <Typography size="sm" weight="regular" color="tertiary">
              Update this user's role.
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
                [styles.radioItemDisabled]: currentRole === "Admin",
              })}
              onClick={() => setRole("Admin")}
              disabled={currentRole === "Admin"}
            >
              <div className={styles.radioContent}>
                <div className={styles.radioIcon}>
                  <ShieldTickIcon />
                </div>
                <div className={styles.radioText}>
                  <Typography size="md" weight="medium" color="secondary">
                    Admin
                    {currentRole === "Admin" && " (current role)"}
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
                [styles.radioItemDisabled]: currentRole === "Member",
              })}
              onClick={() => setRole("Member")}
              disabled={currentRole === "Member"}
            >
              <div className={styles.radioContent}>
                <div className={styles.radioIcon}>
                  <UserIcon />
                </div>
                <div className={styles.radioText}>
                  <Typography size="md" weight="medium" color="secondary">
                    Member
                    {currentRole === "Member" && " (current role)"}
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
