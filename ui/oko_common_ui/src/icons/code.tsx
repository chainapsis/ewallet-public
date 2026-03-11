import type { FC } from "react";

import type { BasicIconProps } from "./types";

export const CodeIcon: FC<BasicIconProps> = ({
  className,
  color = "currentColor",
  size = 20,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 12 11"
      fill="none"
      className={className}
    >
      <path
        d="M8.25 7.75L10.75 5.25L8.25 2.75M3.25 2.75L0.75 5.25L3.25 7.75M6.75 0.75L4.75 9.75"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
