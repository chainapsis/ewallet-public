import type { FC } from "react";

import { s3BucketURL } from "./paths";

export const SolanaCircleIcon: FC<SolanaCircleIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/solana_circle.png`}
      alt="solana_circle_icon"
      width={width}
      height={height}
    />
  );
};

export interface SolanaCircleIconProps {
  width?: number;
  height?: number;
}
