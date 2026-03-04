import { type FC } from "react";

import { s3BucketURL } from "./paths";

export const BaseIcon: FC<BaseIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/base.png`}
      alt="base_icon"
      width={width}
      height={height}
    />
  );
};

export interface BaseIconProps {
  width?: number;
  height?: number;
}
