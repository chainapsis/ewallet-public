import { type FC } from "react";

import { s3BucketURL } from "./paths";

export const CosmosIcon: FC<CosmosIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/cosmos.png`}
      alt="cosmos_icon"
      width={width}
      height={height}
      style={{ borderRadius: "999px" }}
    />
  );
};

export interface CosmosIconProps {
  width?: number;
  height?: number;
}
