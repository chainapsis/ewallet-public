import type { FC } from "react";

import type { BasicIconProps } from "./types";

export const UserRightIcon: FC<BasicIconProps> = ({
  className,
  color = "currentColor",
  size = 16,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M12.6667 14L14.6667 12M14.6667 12L12.6667 10M14.6667 12H10.6667M8.00004 10.3333H5.00004C4.06967 10.3333 3.60448 10.3333 3.22595 10.4482C2.37368 10.7067 1.70673 11.3736 1.4482 12.2259C1.33337 12.6044 1.33337 13.0696 1.33337 14M9.66671 5C9.66671 6.65685 8.32356 8 6.66671 8C5.00985 8 3.66671 6.65685 3.66671 5C3.66671 3.34315 5.00985 2 6.66671 2C8.32356 2 9.66671 3.34315 9.66671 5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
