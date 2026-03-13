import cn from "classnames";
import type React from "react";

import styles from "./button.module.scss";
import { LoadingIcon } from "@oko-wallet-common-ui/icons/loading";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const Button: React.FC<React.PropsWithChildren<ButtonProps>> = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  isLoading = false,
  className,
  children,
  ...rest
}) => {
  const isDisabled = disabled || isLoading;
  const useDisabledStyles = disabled && !isLoading;

  return (
    <button
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        {
          [styles.fullWidth]: fullWidth,
          [styles.disabled]: useDisabledStyles,
          [styles.loading]: isLoading,
        },
        className,
      )}
      disabled={isDisabled}
      {...rest}
    >
      {isLoading && (
        <LoadingIcon
          size={size === "lg" ? 20 : size === "sm" ? 14 : 16}
          className={styles.loadingIcon}
        />
      )}
      {children}
    </button>
  );
};
