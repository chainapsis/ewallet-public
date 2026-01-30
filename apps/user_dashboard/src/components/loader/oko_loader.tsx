import type { FC } from "react";
import Image from "next/image";
import cn from "classnames";

import styles from "./oko_loader.module.scss";

interface OkoLoaderProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const OkoLoader: FC<OkoLoaderProps> = ({
  size = 80,
  className,
}) => {
  const iconSize = (size / 80) * 28;
  return (
    <div className={cn(styles.container, className)}>
      <div
        className={styles.spinnerContainer}
        style={{ width: size, height: size }}
      >
        <Image
          src="/oko_loader_mask.png"
          alt="loading mask"
          fill
          className={styles.colorWheel}
          priority
        />
        <div
          className={styles.iconWrapper}
          style={{ width: iconSize, height: iconSize }}
        >
          <Image
            src="/oko_loader_icon.png"
            alt="loading icon"
            fill
            className={styles.icon}
            priority
          />
        </div>
      </div>
      <span className={styles.loadingText}>LOADING</span>
    </div>
  );
};
