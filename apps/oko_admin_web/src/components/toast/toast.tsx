import cn from "classnames";
import type { FC } from "react";

import styles from "./toast.module.scss";

export type ToastType = "success" | "error";

export interface ToastProps {
  message: string;
  type: ToastType;
  onClose?: () => void;
}

export const Toast: FC<ToastProps> = ({ message, type, onClose }) => (
  <div className={cn(styles.wrapper, styles[type])}>
    {message}
    {onClose && (
      <button type="button" className={styles.close} onClick={onClose}>
        ×
      </button>
    )}
  </div>
);
