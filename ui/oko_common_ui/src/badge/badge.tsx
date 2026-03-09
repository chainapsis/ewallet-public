import cn from "classnames";

import styles from "./badge.module.scss";
import { Typography } from "@oko-wallet-common-ui/typography/typography";

type Color = "gray" | "success" | "warning" | "error" | "brand";
type Size = "sm" | "md" | "lg";

export type BadgeProps = {
  color: Color;
  label: string;
  size: Size;
  type?: "pill" | "square";
};

export const Badge = ({
  color,
  label,
  size = "sm",
  type = "pill",
}: BadgeProps) => {
  function getSize(size: Size) {
    switch (size) {
      case "sm":
        return "xs";
      case "md":
      case "lg":
        return "sm";
    }
  }

  return (
    <span
      className={cn(styles.badge, styles[size], styles[type])}
      style={{
        backgroundColor: `var(--${color}-50)`,
        border: `1px solid var(--${color}-200)`,
      }}
    >
      <Typography
        tagType="span"
        size={getSize(size)}
        weight="medium"
        customColor={`${color}-700`}
      >
        {label}
      </Typography>
    </span>
  );
};
