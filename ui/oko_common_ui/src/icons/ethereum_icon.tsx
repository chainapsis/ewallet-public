import type { FC } from "react";

import { s3BucketURL } from "./paths";

export const EthereumIcon: FC<EthereumIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/ethereum_circle.png`}
      alt="ethereum_icon"
      width={width}
      height={height}
    />
  );
};

export interface EthereumIconProps {
  width?: number;
  height?: number;
}
