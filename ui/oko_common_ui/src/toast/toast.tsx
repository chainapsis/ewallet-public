"use client";

import cn from "classnames";
import type { FC, ReactNode } from "react";

import styles from "./toast.module.scss";
import { CheckCircleOutlinedIcon } from "@oko-wallet-common-ui/icons/check_circle_outlined";
import { ErrorIcon } from "@oko-wallet-common-ui/icons/error_icon";
import { InfoCircleIcon } from "@oko-wallet-common-ui/icons/info_circle";
import { WarningIcon } from "@oko-wallet-common-ui/icons/warning_icon";
import { XCloseIcon } from "@oko-wallet-common-ui/icons/x_close";
import { Typography } from "@oko-wallet-common-ui/typography/typography";

type ToastVariant = "success" | "error" | "warning" | "info" | "confirm";

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

const ToastIcon: FC<{ variant: ToastVariant }> = ({ variant }) => {
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

interface ToastContainerProps {
  children: ReactNode;
  className?: string;
}

const ToastContainer: FC<ToastContainerProps> = ({ children, className }) => (
  <div className={cn(styles.container, className)}>{children}</div>
);

interface ToastInnerProps {
  title?: string;
  description?: string;
  variant: ToastVariant;
}

const ToastInner: FC<ToastInnerProps> = ({ title, variant }) => {
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
    </div>
  );
};

interface ToastCloseButtonProps {
  onClose: () => void;
}

const ToastCloseButton: FC<ToastCloseButtonProps> = ({ onClose }) => {
  return (
    <button type="button" className={styles.closeButton} onClick={onClose}>
      <XCloseIcon color="var(--fg-quaternary)" size={20} />
    </button>
  );
};

interface ToastProps {
  title?: string;
  description?: string;
  variant: ToastVariant;
  onClose?: () => void;
  className?: string;
}
const Toast: FC<ToastProps> & {
  Container: typeof ToastContainer;
  Inner: typeof ToastInner;
  Icon: typeof ToastIcon;
  CloseButton: typeof ToastCloseButton;
} = ({ title, description, variant, onClose, className }) => (
  <ToastContainer className={className}>
    <ToastInner title={title} description={description} variant={variant} />
    {onClose && <ToastCloseButton onClose={onClose} />}
  </ToastContainer>
);

Toast.Container = ToastContainer;
Toast.Inner = ToastInner;
Toast.Icon = ToastIcon;
Toast.CloseButton = ToastCloseButton;

export { Toast, type ToastVariant, type ToastProps };
