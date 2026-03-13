import type { FC } from "react";

import { s3BucketURL } from "./paths";
import type { Theme } from "@oko-wallet-common-ui/theme/theme_provider";

export const OkoLogoWithNameIcon: FC<OkoLogoWithNameIconProps> = ({
  width = 39,
  height = 14,
  className,
  theme,
}) => {
  const _theme = theme ?? "dark";

  return (
    <img
      src={
        _theme === "light"
          ? `${s3BucketURL}/oko_logo_with_name_light.svg`
          : `${s3BucketURL}/oko_logo_with_name_dark.svg`
      }
      alt="oko_logo_icon"
      width={width}
      height={height}
      className={className}
    />
  );
};

export interface OkoLogoWithNameIconProps {
  width?: number;
  height?: number;
  className?: string;
  theme?: Theme | null;
}
