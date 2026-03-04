import { type FC } from "react";

import { s3BucketURL } from "./paths";

export const RialoIcon: FC<RialoIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/rialo.png`}
      alt="rialo_icon"
      width={width}
      height={height}
    />
  );
};

export interface RialoIconProps {
  width?: number;
  height?: number;
}
