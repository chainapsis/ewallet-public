import React from "react";

import { s3BucketURL } from "./paths";

export const SolanaIcon: React.FC<SolanaIconProps> = ({
  width = 16,
  height = 16,
}) => {
  return (
    <img
      src={`${s3BucketURL}/solana.png`}
      alt="solana_icon"
      width={width}
      height={height}
      style={{ borderRadius: "999px" }}
    />
  );
};

export interface SolanaIconProps {
  width?: number;
  height?: number;
}
