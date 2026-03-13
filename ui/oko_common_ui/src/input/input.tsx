import cn from "classnames";
import type { FC, ReactNode } from "react";

import styles from "./input.module.scss";
import { Typography } from "@oko-wallet-common-ui/typography/typography";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "error";
  inputSize?: "md" | "lg";
  fullWidth?: boolean;
  label?: string;
  requiredSymbol?: boolean;
  error?: string;
  helpText?: string;
  SideComponent?: ReactNode;
  resetError?: () => void;
}

export const Input: FC<InputProps> = ({
  variant = "default",
  inputSize = "md",
  fullWidth = false,
  label,
  requiredSymbol = false,
  disabled = false,
  className,
  name,
  error,
  helpText,
  SideComponent,
  resetError,
  onChange,
  ...rest
}) => {
  const inputClassName = cn(
    styles.input,
    styles[variant],
    styles[inputSize],
    {
      [styles.fullWidth]: fullWidth,
      [styles.disabled]: disabled,
      [styles.hasError]: error,
    },
    className,
  );

  return (
    <div
      className={cn(styles.wrapper, {
        [styles.fullWidth]: fullWidth,
      })}
    >
      <label className={styles.label} htmlFor={name}>
        {label}
        {requiredSymbol && (
          <Typography color="brand-tertiary" size="sm" weight="medium">
            *
          </Typography>
        )}
      </label>

      <div className={styles.inputWrapper}>
        <input
          name={name}
          id={name}
          className={inputClassName}
          autoComplete="off"
          onChange={(e) => {
            onChange?.(e);
            resetError?.();
          }}
          disabled={disabled}
          {...rest}
        />
        {SideComponent}
      </div>

      {helpText && (
        <Typography color="tertiary" size="sm">
          {helpText}
        </Typography>
      )}

      {error && (
        <Typography color="error-primary" size="sm">
          {error}
        </Typography>
      )}
    </div>
  );
};
