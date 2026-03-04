import { type FC } from "react";

import { s3BucketURL } from "./paths";

export const ArbitrumIcon: FC<ArbitrumIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/arbitrum.png`}
      alt="arbitrum_icon"
      width={width}
      height={height}
    />
  );
};

export interface ArbitrumIconProps {
  width?: number;
  height?: number;
}
