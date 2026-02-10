import type { FC } from "react";

import styles from "./base_sponsorship_background.module.scss";

// S3 asset URLs for Base chain sponsorship pattern images
const BASE_PATTERN_ASSETS = {
  patternBlue:
    "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/base_chain/pattern-blue.png",
  patternGray:
    "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/base_chain/pattern-gray.png",
};

// CSS linear-gradient values matching Figma design
const GRADIENTS = {
  lightNormal:
    "linear-gradient(157.64deg, rgba(255, 255, 255, 0) 53.234%, rgb(178, 221, 255) 93.146%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)",
  darkNormal:
    "linear-gradient(143.9deg, rgba(13, 15, 19, 0.31) 64.704%, rgb(13, 52, 73) 92.501%), linear-gradient(90deg, rgb(12, 14, 18) 0%, rgb(12, 14, 18) 100%)",
  lightError:
    "linear-gradient(156.16deg, rgba(255, 255, 255, 0) 53.234%, rgb(221, 225, 227) 93.146%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)",
  darkError:
    "linear-gradient(142.53deg, rgba(13, 15, 19, 0.31) 64.704%, rgb(39, 43, 50) 92.501%), linear-gradient(90deg, rgb(12, 14, 18) 0%, rgb(12, 14, 18) 100%)",
};

export interface BaseSponsorshipBackgroundProps {
  isError?: boolean;
  theme?: "light" | "dark" | "system" | null;
}

export const BaseSponsorshipBackground: FC<BaseSponsorshipBackgroundProps> = ({
  isError = false,
  theme,
}) => {
  const isDark = theme === "dark";

  const patternUrl = isError
    ? BASE_PATTERN_ASSETS.patternGray
    : BASE_PATTERN_ASSETS.patternBlue;

  const gradient = isError
    ? isDark
      ? GRADIENTS.darkError
      : GRADIENTS.lightError
    : isDark
      ? GRADIENTS.darkNormal
      : GRADIENTS.lightNormal;

  return (
    <>
      {/* Gradient overlay */}
      <div className={styles.gradient} style={{ backgroundImage: gradient }} />
      {/* Pattern overlay */}
      <div
        className={styles.pattern}
        style={{ backgroundImage: `url(${patternUrl})` }}
      />
    </>
  );
};
