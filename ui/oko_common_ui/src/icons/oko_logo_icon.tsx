import { type FC } from "react";

import { s3BucketURL } from "./paths";
import type { Theme } from "@oko-wallet-common-ui/theme/theme_provider";

export const OkoLogoIcon: FC<OkoLogoIconProps> = ({
  width = 72,
  height = 28,
  className,
}) => {
  return (
    <img
      src={`${s3BucketURL}/oko_logo.png`}
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
