import type { FC } from "react";

export const TelegramIcon: FC<TelegramIconProps> = ({ size = 20 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle cx="10" cy="10" r="8.75" fill="url(#paint0_linear_1388_15128)" />
      <path
        d="M14.3666 6.38049C14.4445 5.87707 13.9659 5.47972 13.5183 5.67625L4.60301 9.59053C4.28202 9.73146 4.3055 10.2177 4.63842 10.3237L6.47697 10.9092C6.82786 11.0209 7.20783 10.9631 7.51424 10.7514L11.6594 7.88767C11.7844 7.80131 11.9206 7.97904 11.8138 8.08914L8.83007 11.1654C8.54063 11.4638 8.59808 11.9695 8.94623 12.1878L12.2868 14.2827C12.6615 14.5176 13.1436 14.2816 13.2136 13.8288L14.3666 6.38049Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_1388_15128"
          x1="10"
          y1="1.25"
          x2="10"
          y2="18.75"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#37BBFE" />
          <stop offset="1" stopColor="#007DBB" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export interface TelegramIconProps {
  size?: number;
}
