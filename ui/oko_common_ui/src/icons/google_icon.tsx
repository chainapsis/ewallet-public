import type { FC } from "react";

import { s3BucketURL } from "./paths";

export const GoogleIcon: FC<GoogleIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/google.png`}
      alt="google_icon"
      width={width}
      height={height}
    />
  );
};

export interface GoogleIconProps {
  width?: number;
  height?: number;
}
