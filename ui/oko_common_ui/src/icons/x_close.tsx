import type { FC } from "react";

import type { BasicIconProps } from "./types";

export const XCloseIcon: FC<BasicIconProps> = ({
  className,
  size = 20,
  color = "#A4A7AE",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="M15 5L5 15M5 5L15 15"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
