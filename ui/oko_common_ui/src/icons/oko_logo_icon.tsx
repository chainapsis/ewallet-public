import type { FC } from "react";

import { s3BucketURL } from "./paths";
import type { Theme } from "@oko-wallet-common-ui/theme/theme_provider";

export const OkoLogoIcon: FC<OkoLogoIconProps> = ({
  width = 72,
  height = 28,
  className,
  theme,
}) => {
  const _theme = theme ?? "dark";

  return (
    <img
      src={
        _theme === "light"
          ? `${s3BucketURL}/oko_logo.png`
          : `${s3BucketURL}/oko_logo_dark_v2.png`
      }
      alt="oko_logo_icon"
      width={width}
      height={height}
      className={className}
    />
  );
};

export interface OkoLogoIconProps {
  width?: number;
  height?: number;
  className?: string;
  theme?: Theme | null;
}
