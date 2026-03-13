import { type FC, useState } from "react";

import styles from "./avatar.module.scss";

export interface AvatarProps {
  src?: string;
  fallback?: string;
  alt: string;
}

export const Avatar: FC<AvatarProps> = ({ src, fallback, alt }) => {
  const [imgSrc, setImgSrc] = useState(src || fallback || "");
  const [showAlt, setShowAlt] = useState(!src && !fallback);

  const handleError = () => {
    if (imgSrc === src && fallback) {
      setImgSrc(fallback);
    } else {
      setShowAlt(true);
    }
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return words
      .map((w) => w[0].toUpperCase())
      .join("")
      .slice(0, 2);
  };

  if (showAlt) {
    return (
      <div className={styles.wrapper}>
        <span className={styles.altText}>{getInitials(alt)}</span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <img
        src={imgSrc}
        width={40}
        height={40}
        alt={alt}
        onError={handleError}
        className={styles.image}
      />
    </div>
  );
};
