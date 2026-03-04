import { type FC } from "react";

import { s3BucketURL } from "./paths";

export const InitiaIcon: FC<InitiaIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/initia.png`}
      alt="initia_icon"
      width={width}
      height={height}
    />
  );
};

export interface InitiaIconProps {
  width?: number;
  height?: number;
}
