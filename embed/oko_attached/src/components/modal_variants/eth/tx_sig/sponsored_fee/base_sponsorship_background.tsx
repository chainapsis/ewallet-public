import type { FC } from "react";
import cn from "classnames";

import styles from "./base_sponsorship_background.module.scss";

export interface BaseSponsorshipBackgroundProps {
  isError?: boolean;
  theme?: "light" | "dark" | "system" | null;
}

export const BaseSponsorshipBackground: FC<BaseSponsorshipBackgroundProps> = ({
  isError = false,
  theme,
}) => {
  const isDark = theme === "dark";

  const gradientVariant = isDark
    ? isError
      ? styles.dark_error
      : styles.dark_normal
    : isError
      ? styles.light_error
      : styles.light_normal;

  const patternVariant = isError ? styles.gray : styles.blue;

  return (
    <>
      {/* Gradient overlay */}
      <div className={cn(styles.gradient, gradientVariant)} />
      {/* Pattern overlay */}
      <div className={cn(styles.pattern, patternVariant)} />
    </>
  );
};
