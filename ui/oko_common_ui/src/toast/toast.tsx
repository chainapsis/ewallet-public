"use client";

import { type FC, type MouseEvent } from "react";

import { CheckCircleOutlinedIcon } from "@oko-wallet-common-ui/icons/check_circle_outlined";
import { ErrorIcon } from "@oko-wallet-common-ui/icons/error_icon";
import { WarningIcon } from "@oko-wallet-common-ui/icons/warning_icon";
import { InfoCircleIcon } from "@oko-wallet-common-ui/icons/info_circle";
import { Typography } from "@oko-wallet-common-ui/typography/typography";
import { XCloseIcon } from "@oko-wallet-common-ui/icons/x_close";
import styles from "./toast.module.scss";

export type ToastVariant = "success" | "error" | "warning" | "info" | "confirm";
export type ToastItemProps = {
  title?: string;
  description?: string;
  variant: ToastVariant;
};

const SuccessToastIcon: FC = () => {
  return (
    <div className={styles.successIcon}>
      <div className={styles.successIconOuterRing1} />
      <div className={styles.successIconOuterRing2} />
      <CheckCircleOutlinedIcon size={20} />
    </div>
  );
};

const ConfirmToastIcon: FC = () => {
  return (
    <div className={styles.confirmIcon}>
      <div className={styles.confirmIconOuterRing1} />
      <div className={styles.confirmIconOuterRing2} />
      <CheckCircleOutlinedIcon size={20} />
    </div>
  );
};

interface ToastIconProps {
  variant: ToastVariant;
}
const ToastIcon: FC<ToastIconProps> = ({ variant }) => {
  switch (variant) {
    case "success":
      return <SuccessToastIcon />;
    case "confirm":
      return <ConfirmToastIcon />;
    case "error":
      return <ErrorIcon size={20} />;
    case "warning":
      return <WarningIcon size={20} />;
    default:
      return <InfoCircleIcon size={20} />;
  }
};

export const Toast: FC<ToastItemProps> = ({ title, variant }) => {
  return (
    <div
      className={styles.toastInner}
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
    >
      <ToastIcon variant={variant} />
      {title && (
        <Typography size="sm" weight="semibold" color="primary">
          {title}
        </Typography>
      )}
      {/* TODO: add description, now there is no description in the design*/}
      {/* {description && <div className={styles.description}>{description}</div>} */}
    </div>
  );
};

interface ToastCloseButtonProps {
  closeToast: (e: MouseEvent<HTMLElement>) => void;
}
export const ToastCloseButton: FC<ToastCloseButtonProps> = ({ closeToast }) => {
  return (
    <button type="button" className={styles.closeButton} onClick={closeToast}>
      <XCloseIcon color="var(--fg-quaternary)" size={20} />
    </button>
  );
};
