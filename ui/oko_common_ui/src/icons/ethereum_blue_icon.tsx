import type { FC } from "react";

import { s3BucketURL } from "./paths";

export const EthereumBlueIcon: FC<EthereumBlueIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/ethereum-blue.png`}
      alt="ethereum_icon"
      width={width}
      height={height}
      style={{ borderRadius: "999px" }}
    />
  );
};

export interface EthereumBlueIconProps {
  width?: number;
  height?: number;
}
