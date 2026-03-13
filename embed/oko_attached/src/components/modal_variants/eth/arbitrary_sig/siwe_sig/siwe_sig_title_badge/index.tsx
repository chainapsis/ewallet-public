import { ImageWithAlt } from "@oko-wallet/oko-common-ui/image_with_alt";
import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import type { FC } from "react";

import styles from "./styles.module.scss";
import { OKO_PUBLIC_S3_BUCKET_URL } from "@oko-wallet-attached/requests/endpoints";

interface SiweSigTitleBadgeProps {
  theme: Theme | null;
}
export const SiweSigTitleBadge: FC<SiweSigTitleBadgeProps> = ({ theme }) => {
  const imageUrl = {
    png:
      theme === "dark"
        ? `${OKO_PUBLIC_S3_BUCKET_URL}/assets/oko_siwe_sign_badge_dark.png`
        : `${OKO_PUBLIC_S3_BUCKET_URL}/assets/oko_siwe_sign_badge_light.png`,
    webp:
      theme === "dark"
        ? `${OKO_PUBLIC_S3_BUCKET_URL}/assets/oko_siwe_sign_badge_dark.webp`
        : `${OKO_PUBLIC_S3_BUCKET_URL}/assets/oko_siwe_sign_badge_light.webp`,
  };

  return (
    <div className={styles.imageContainer}>
      <ImageWithAlt
        srcSet={imageUrl.webp}
        srcAlt={imageUrl.png}
        alt="sign siwe title image"
        className={styles.image}
      />
    </div>
  );
};
