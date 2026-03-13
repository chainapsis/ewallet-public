import cn from "classnames";
import type { FC } from "react";

import styles from "./toggle.module.scss";
import { Typography } from "@oko-wallet-common-ui/typography/typography";

export interface ToggleProps {
  onChange: (checked: boolean) => void;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const Toggle: FC<ToggleProps> = ({
  onChange,
  checked = false,
  disabled = false,
  label,
  className,
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={cn(styles.wrapper, className)}>
      <div
        className={cn(styles.toggle, {
          [styles.checked]: checked,
          [styles.disabled]: disabled,
        })}
        onClick={handleToggle}
        role="switch"
        // attributes for accessibility
        tabIndex={disabled ? -1 : 0}
        aria-checked={checked}
        aria-disabled={disabled}
      >
        <div className={styles.track}>
          <div className={styles.thumb} />
        </div>
      </div>

      {label && (
        <span
          className={cn(styles.label, {
            [styles.disabled]: disabled,
          })}
          onClick={!disabled ? handleToggle : undefined}
        >
          <Typography
            tagType="span"
            size="sm"
            weight="medium"
            color={disabled ? "disabled" : "secondary"}
          >
            {label}
          </Typography>
        </span>
      )}
    </div>
  );
};
