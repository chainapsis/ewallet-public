import { type FC, useEffect, useRef, useState } from "react";

import styles from "./avatar.module.scss";
import { AvatarInitial } from "./avatar_initial";

export interface AvatarProps {
  src?: string;
  fallback?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "circular" | "rounded";
}

function getSizeInPixels(size: AvatarProps["size"]) {
  switch (size) {
    case "sm":
      return 16;
    case "md":
      return 24;
    case "lg":
      return 32;
    case "xl":
      return 48;
    default:
      return 32;
  }
}

function getTextSize(size: AvatarProps["size"]) {
  switch (size) {
    case "sm":
      return "xs";
    case "md":
      return "sm";
    case "lg":
      return "md";
    case "xl":
      return "lg";
    default:
      return "sm";
  }
}

function getInitial(name: string) {
  const words = name.trim().split(/\s+/);
  return words[0].slice(0, 1).toUpperCase();
}

function getBorderRadius(variant: AvatarProps["variant"]) {
  switch (variant) {
    case "circular":
      return "9999px";
    case "rounded":
      return "12px";
    default:
      return "9999px";
  }
}

export const Avatar: FC<AvatarProps> = ({
  src,
  fallback,
  alt,
  size = "md",
  variant = "circular",
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentSrc(src || fallback || null);
  }, [src, fallback]);

  function handleLoad() {
    setIsLoaded(true);
  }

  function handleError() {
    if (currentSrc === src && fallback) {
      setCurrentSrc(fallback);
      setHasError(false);
      setIsLoaded(false);
    } else {
      setHasError(true);
      setIsLoaded(false);
    }
  }

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);

    if (imgRef.current && currentSrc) {
      const img = imgRef.current;
      if (img.complete && img.src === currentSrc) {
        setIsLoaded(true);
      }
    }
  }, [currentSrc]);

  const pixelSize = getSizeInPixels(size);
  const textSize = getTextSize(size);
  const borderRadius = getBorderRadius(variant);

  if (!currentSrc || hasError) {
    return (
      <AvatarInitial
        initial={getInitial(alt)}
        sizePx={pixelSize}
        textSize={textSize}
        borderRadius={borderRadius}
        variant="block"
      />
    );
  }

  return (
    <div
      className={styles.wrapper}
      style={{
        width: pixelSize,
        height: pixelSize,
        borderRadius,
        position: "relative",
      }}
    >
      {
        <AvatarInitial
          initial={getInitial(alt)}
          sizePx={pixelSize}
          textSize={textSize}
          borderRadius={borderRadius}
          variant="overlay"
          visible={!isLoaded}
        />
      }
      <img
        ref={imgRef}
        src={currentSrc}
        width={pixelSize}
        height={pixelSize}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          borderRadius,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          position: "relative",
          zIndex: 1,
          opacity: isLoaded ? 1 : 0,
        }}
      />
    </div>
  );
};
