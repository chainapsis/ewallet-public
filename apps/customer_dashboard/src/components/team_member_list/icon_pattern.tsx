import type { FC } from "react";

export const IconPattern: FC<{ className?: string }> = ({ className }) => (
  <svg
    width="216"
    height="216"
    viewBox="0 0 216 216"
    fill="none"
    className={className}
  >
    <mask
      id="icon-pattern-mask"
      style={{ maskType: "alpha" }}
      maskUnits="userSpaceOnUse"
      x="-120"
      y="-120"
      width="336"
      height="336"
    >
      <rect
        width="336"
        height="336"
        transform="translate(-120 -120)"
        fill="url(#icon-pattern-gradient)"
      />
    </mask>
    <g mask="url(#icon-pattern-mask)">
      <circle cx="48" cy="48" r="47.5" stroke="#E9EAEB" />
      <circle cx="48" cy="48" r="71.5" stroke="#E9EAEB" />
      <circle cx="48" cy="48" r="95.5" stroke="#E9EAEB" />
      <circle cx="48" cy="48" r="119.5" stroke="#E9EAEB" />
      <circle cx="48" cy="48" r="143.5" stroke="#E9EAEB" />
      <circle cx="48" cy="48" r="167.5" stroke="#E9EAEB" />
    </g>
    <defs>
      <radialGradient
        id="icon-pattern-gradient"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(168 168) rotate(90) scale(168 168)"
      >
        <stop />
        <stop offset="1" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);
