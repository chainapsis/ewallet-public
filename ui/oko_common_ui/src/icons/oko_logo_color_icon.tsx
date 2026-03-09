import { type FC } from "react";

import { s3BucketURL } from "./paths";
import type { Theme } from "@oko-wallet-common-ui/theme/theme_provider";

export const OkoLogoColorIcon: FC<OkoLogoColorIconProps> = ({
  width = 47,
  height = 18,
  className,
  theme,
}) => {
  const _theme = theme ?? "dark";

  return (
    <img
      src={
        _theme === "light"
          ? `${s3BucketURL}/oko_logo_color.png`
          : `${s3BucketURL}/oko_logo_color_white.png`
      }
      alt="oko_logo_icon"
      width={width}
      height={height}
      className={className}
    />
  );
};

export interface OkoLogoColorIconProps {
  width?: number;
  height?: number;
  className?: string;
  theme?: Theme | null;
}
