import type React from "react";

import { s3BucketURL } from "./paths";

export const LogoTextIcon: FC<LogoTextIconProps> = ({
  width = 54.231,
  height = "auto",
  style,
}) => {
  return (
    <img
      src={`${s3BucketURL}/logo_text.png`}
      alt="logo_text_icon"
      width={width}
      height={height}
      style={
        style ?? {
          paddingTop: "6px",
        }
      }
    />
  );
};

export interface LogoTextIconProps {
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}
