import cn from "classnames";
import type { FC } from "react";

import styles from "./checkbox.module.scss";
import { CheckIcon } from "@oko-wallet-common-ui/icons/check_icon";
import {
  type BaseTypographyProps,
  Typography,
} from "@oko-wallet-common-ui/typography/typography";

interface CheckboxProps {
  id: string;
  size?: "sm" | "md";
  checked: boolean;
  onChange: (checked: boolean) => void;
  checkBoxInputContainerClassName?: string;
  checkboxContainerClassName?: string;

  label: string;
  labelStyle?: {
    color?: BaseTypographyProps["color"];
    size?: BaseTypographyProps["size"];
    weight?: BaseTypographyProps["weight"];
  };
}

export const Checkbox: FC<CheckboxProps> = ({
  id,
  size = "md",
  checked,
  onChange,
  label,
  labelStyle,
  checkBoxInputContainerClassName,
  checkboxContainerClassName,
}) => {
  const iconSize = size === "sm" ? 12 : 14;
  const checkBoxInputStyle = cn(
    styles.checkboxInput,
    styles[`checkboxInput-${size}`],
    checked ? styles.checkboxInputChecked : styles.checkboxInputUnChecked,
  );
  const checkboxContainerStyle = cn(
    styles.checkboxContainer,
    styles[`checkboxContainer-${size}`],
    checkboxContainerClassName,
  );

  return (
    <div className={styles.checkboxControl}>
      <input
        type="checkbox"
        id={id}
        className={styles.checkboxHidden}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className={checkboxContainerStyle}>
        <div
          className={cn(
            styles.checkboxInputContainer,
            checkBoxInputContainerClassName,
          )}
        >
          <span className={checkBoxInputStyle}>
            {/* NOTE: For animate processing, it adjust the display by adjusting the opacity of the corresponding icon in the css @retto*/}
            <CheckIcon size={iconSize} />
          </span>
        </div>
        <Typography
          size={labelStyle?.size ?? "sm"}
          weight={labelStyle?.weight ?? "medium"}
          color={labelStyle?.color ?? "secondary"}
        >
          {label}
        </Typography>
      </label>
    </div>
  );
};
