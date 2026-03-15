import type { FC } from "react";

import type { BasicIconProps } from "./types";

export const AlertTriangleIcon: FC<BasicIconProps> = ({
  className,
  color = "#F79009",
  size = 16,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M7.50893 5.00276V7.66942M7.50893 10.3361H7.5156M6.58581 1.59724L1.10255 11.0683C0.798418 11.5936 0.64635 11.8563 0.668825 12.0719C0.688429 12.2599 0.786942 12.4308 0.939847 12.542C1.11515 12.6694 1.41866 12.6694 2.02568 12.6694H12.9922C13.5992 12.6694 13.9027 12.6694 14.078 12.542C14.2309 12.4308 14.3294 12.2599 14.349 12.0719C14.3715 11.8563 14.2194 11.5936 13.9153 11.0683L8.43205 1.59724C8.12901 1.0738 7.97749 0.812075 7.7798 0.724173C7.60736 0.647498 7.41051 0.647498 7.23807 0.724173C7.04038 0.812075 6.88886 1.0738 6.58581 1.59724Z"
        stroke={color}
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
