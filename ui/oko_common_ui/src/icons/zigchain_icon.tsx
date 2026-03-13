import type { FC } from "react";

import { s3BucketURL } from "./paths";

export const ZigchainIcon: FC<ZigchainIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/zigchain.png`}
      alt="zigchain_icon"
      width={width}
      height={height}
    />
  );
};

export interface ZigchainIconProps {
  width?: number;
  height?: number;
}
