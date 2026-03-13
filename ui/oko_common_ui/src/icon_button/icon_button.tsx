import cn from "classnames";
import type React from "react";
import type { FC, ReactNode } from "react";

import styles from "./icon_button.module.scss";

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  hierarchy?: "tertiary" | "secondary";
  size?: "xs" | "sm";
  icon: ReactNode;
}

export const IconButton: FC<IconButtonProps> = ({
  hierarchy = "tertiary",
  size = "sm",
  icon,
  disabled = false,
  className,
  ...rest
}) => {
  return (
    <button
      type="button"
      className={cn(
        styles.iconButton,
        styles[hierarchy],
        styles[size],
        { [styles.disabled]: disabled },
        className,
      )}
      disabled={disabled}
      {...rest}
    >
      <span className={styles.icon}>{icon}</span>
    </button>
  );
};
