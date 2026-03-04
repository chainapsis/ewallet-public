import React, { type FC, type ReactNode } from "react";
import cn from "classnames";

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
