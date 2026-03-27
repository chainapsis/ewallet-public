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
      viewBox="-0.58 -1.25 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M11.4167 4.08333L14.0833 6.75M14.0833 6.75L11.4167 9.41667M14.0833 6.75H5.41667M9.41667 1.55269C8.56683 1.04218 7.58016 0.75 6.52778 0.75C3.3368 0.75 0.75 3.43629 0.75 6.75C0.75 10.0637 3.3368 12.75 6.52778 12.75C7.58016 12.75 8.56683 12.4578 9.41667 11.9473"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
