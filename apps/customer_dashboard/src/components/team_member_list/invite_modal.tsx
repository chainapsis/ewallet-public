"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { ErrorIcon } from "@oko-wallet/oko-common-ui/icons/error_icon";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { type FC, useRef, useState } from "react";

import { IconPattern } from "./icon_pattern";
import styles from "./invite_modal.module.scss";

interface InviteModalProps {
  onInvite: (email: string, role: "Admin" | "Member") => void;
  onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M1.67 5.83L8.47 10.6a2.5 2.5 0 0 0 3.06 0l6.8-4.77M5.67 16.67h8.66c1.87 0 2.8 0 3.51-.36a3.33 3.33 0 0 0 1.46-1.46c.37-.71.37-1.64.37-3.51V8.67c0-1.87 0-2.8-.37-3.51a3.33 3.33 0 0 0-1.46-1.46c-.71-.37-1.64-.37-3.51-.37H5.67c-1.87 0-2.8 0-3.51.37a3.33 3.33 0 0 0-1.46 1.46c-.37.71-.37 1.64-.37 3.51v2.67c0 1.87 0 2.8.37 3.51a3.33 3.33 0 0 0 1.46 1.46c.71.36 1.64.36 3.51.36Z"
      stroke="var(--fg-quaternary)"
      strokeWidth="1.67"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

const UserPlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 15.5H7.5C6.10444 15.5 5.40665 15.5 4.83886 15.6722C3.56045 16.06 2.56004 17.0605 2.17224 18.3389C2 18.9067 2 19.6044 2 21M19 21V15M16 18H22M14.5 7.5C14.5 9.98528 12.4853 12 10 12C7.51472 12 5.5 9.98528 5.5 7.5C5.5 5.01472 7.51472 3 10 3C12.4853 3 14.5 5.01472 14.5 7.5Z"
      stroke="var(--fg-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const InviteModal: FC<InviteModalProps> = ({ onInvite, onClose }) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Member">("Admin");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const mouseDownOnOverlay = useRef(false);

  const validate = (value: string) => {
    if (!value.trim()) {
      return "Email is required.";
    }
    if (!EMAIL_REGEX.test(value)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const handleBlur = () => {
    if (!email.trim()) {
      return;
    }
    setTouched(true);
    setError(validate(email));
  };

  const handleChange = (value: string) => {
    setEmail(value);
    if (touched) {
      setError(validate(value));
    }
  };

  const handleSubmit = () => {
    const validationError = validate(email);
    if (validationError) {
      setTouched(true);
      setError(validationError);
      return;
    }
    onInvite(email.trim(), role);
  };

  const hasError = touched && !!error;

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
              <UserPlusIcon />
            </div>
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Invite Users
            </Typography>
            <Typography size="sm" weight="regular" color="tertiary">
              Invite teammates to collaborate.
            </Typography>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.fieldGroup}>
            <Typography
              size="sm"
              weight="medium"
              color="secondary"
              tagType="label"
            >
              Email &amp; Role{" "}
              <Typography
                size="sm"
                weight="medium"
                color="error-primary"
                tagType="span"
              >
                *
              </Typography>
            </Typography>
            <div
              className={cn(styles.emailInput, {
                [styles.emailInputError]: hasError,
              })}
            >
              <MailIcon />
              <input
                type="email"
                className={styles.emailField}
                placeholder="email@email.com"
                value={email}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
              />
              {hasError && (
                <ErrorIcon
                  color="var(--fg-error-primary)"
                  size={16}
                  className={styles.errorIcon}
                />
              )}
            </div>
            {hasError && (
              <Typography size="sm" weight="regular" color="error-primary">
                {error}
              </Typography>
            )}
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
                    Full control over the team
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
          <Button variant="primary" size="md" fullWidth onClick={handleSubmit}>
            Send invite
          </Button>
        </div>
      </div>
    </div>
  );
};
