import type { FC } from "react";

import { s3BucketURL } from "./paths";

export const OsmosisIcon: FC<OsmosisIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/osmosis.png`}
      alt="osmosis_icon"
      width={width}
      height={height}
    />
  );
};

export interface OsmosisIconProps {
  width?: number;
  height?: number;
}
