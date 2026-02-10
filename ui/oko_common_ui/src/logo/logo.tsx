import type { FC } from "react";

import styles from "./logo.module.scss";
import { OkoLogoIcon } from "@oko-wallet-common-ui/icons/oko_logo_icon";
import type { Theme } from "@oko-wallet-common-ui/theme/theme_provider";

export interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  theme?: Theme | null;
}

export const Logo: FC<LogoProps> = ({
  width = 72,
  height = 28,
  className,
}) => {
  return (
    <div className={styles.logoContainer}>
      <OkoLogoIcon
        width={width}
        height={height}
        className={className}
      />
    </div>
  );
};
