import type { FC } from "react";

import type { BasicIconProps } from "./types";

export const ThreeDotsVerticalIcon: FC<BasicIconProps> = ({
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
        d="M8.00004 8.66675C8.36823 8.66675 8.66671 8.36827 8.66671 8.00008C8.66671 7.63189 8.36823 7.33341 8.00004 7.33341C7.63185 7.33341 7.33337 7.63189 7.33337 8.00008C7.33337 8.36827 7.63185 8.66675 8.00004 8.66675Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.00004 4.00008C8.36823 4.00008 8.66671 3.7016 8.66671 3.33341C8.66671 2.96522 8.36823 2.66675 8.00004 2.66675C7.63185 2.66675 7.33337 2.96522 7.33337 3.33341C7.33337 3.7016 7.63185 4.00008 8.00004 4.00008Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.00004 13.3334C8.36823 13.3334 8.66671 13.0349 8.66671 12.6667C8.66671 12.2986 8.36823 12.0001 8.00004 12.0001C7.63185 12.0001 7.33337 12.2986 7.33337 12.6667C7.33337 13.0349 7.63185 13.3334 8.00004 13.3334Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
