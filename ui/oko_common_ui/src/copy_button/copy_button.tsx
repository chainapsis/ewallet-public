import cn from "classnames";
import type React from "react";
import type { ReactNode } from "react";

import styles from "./copy_button.module.scss";
import { Button, type ButtonProps } from "@oko-wallet-common-ui/button/button";
import { IconTransition } from "@oko-wallet-common-ui/icon_transition/icon_transition";
import { CheckThinIcon } from "@oko-wallet-common-ui/icons/check_thin_icon";
import { CopyOutlinedIcon } from "@oko-wallet-common-ui/icons/copy_outlined";

interface CopyButtonProps extends Omit<ButtonProps, "children"> {
  isCopied: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children?: ReactNode;
  iconSize?: number;
  defaultColor?: string;
  successColor?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  isCopied,
  onClick,
  children,
  iconSize,
  size = "md",
  className,
  defaultColor,
  successColor,
  ...rest
}) => {
  const resolvedIconSize =
    iconSize ?? (size === "lg" ? 20 : size === "sm" ? 14 : 16);

  return (
    <Button
      size={size}
      className={cn(styles.copyButton, className)}
      onClick={onClick}
      {...rest}
    >
      <IconTransition
        isActive={isCopied}
        defaultIcon={
          <CopyOutlinedIcon size={resolvedIconSize} color={defaultColor} />
        }
        activeIcon={
          <CheckThinIcon
            size={resolvedIconSize}
            color={successColor ?? "var(--fg-success-primary)"}
          />
        }
      />
      {children}
    </Button>
  );
};
