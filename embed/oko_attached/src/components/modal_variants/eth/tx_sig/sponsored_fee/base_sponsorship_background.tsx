import type { FC } from "react";
import cn from "classnames";

import styles from "./base_sponsorship_background.module.scss";

// S3 asset URLs for Base chain sponsorship
const BASE_ASSETS = {
  // Pattern images
  patternBlue:
    "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/base_chain/pattern-blue.png",
  patternGray:
    "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/base_chain/pattern-gray.png",

  // Gradient images
  gradientLightNormal:
    "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/base_chain/Rectangle+7879.png",
  gradientDarkNormal:
    "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/base_chain/Rectangle+7881.png",
  gradientLightError:
    "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/base_chain/Rectangle+7882.png",
  gradientDarkError:
    "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/base_chain/Rectangle+7883.png",
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
    ? BASE_ASSETS.patternGray
    : BASE_ASSETS.patternBlue;

  const gradientUrl = isError
    ? isDark
      ? BASE_ASSETS.gradientDarkError
      : BASE_ASSETS.gradientLightError
    : isDark
      ? BASE_ASSETS.gradientDarkNormal
      : BASE_ASSETS.gradientLightNormal;

  return (
    <>
      {/* Gradient overlay */}
      <div
        className={styles.gradient}
        style={{ backgroundImage: `url(${gradientUrl})` }}
      />
      {/* Pattern overlay */}
      <div
        className={styles.pattern}
        style={{ backgroundImage: `url(${patternUrl})` }}
      />
    </>
  );
};
