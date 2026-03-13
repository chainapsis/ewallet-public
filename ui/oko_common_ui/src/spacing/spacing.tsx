import type { FC } from "react";

export type SpacingProps =
  | {
      height: number;
      width?: undefined;
    }
  | {
      height?: undefined;
      width: number;
    };

export const Spacing: FC<SpacingProps> = ({ height, width }) => {
  if (height) {
    return <div style={{ height, width: "100%" }} />;
  }

  if (width) {
    return <div style={{ width, height: "100%" }} />;
  }
};
