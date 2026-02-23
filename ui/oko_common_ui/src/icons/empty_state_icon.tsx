import type { FC } from "react";

import type { BasicIconProps } from "./types";

export const EmptyStateIcon: FC<BasicIconProps> = ({
  className,
  size = 28,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
    >
      <title>Empty state</title>
      <g clipPath="url(#clip0_239_3873)">
        <rect width="28" height="28" rx="14" fill="var(--bg-secondary-hover)" />
        <mask
          id="mask0_239_3873"
          style={{ maskType: "alpha" }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="28"
          height="28"
        >
          <rect width="28" height="28" rx="14" fill="var(--bg-secondary-hover)" />
        </mask>
        <g mask="url(#mask0_239_3873)">
          <line
            x1="-0.143517"
            y1="-0.352577"
            x2="28.8479"
            y2="28.6388"
            stroke="var(--border-primary)"
          />
          <line
            x1="28.1372"
            y1="0.357497"
            x2="-0.147066"
            y2="28.6418"
            stroke="var(--border-primary)"
            strokeLinecap="round"
          />
          <circle cx="14" cy="14" r="9" stroke="var(--border-primary)" />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_239_3873">
          <rect width="28" height="28" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
