import cn from "classnames";
import type { FC, ReactNode } from "react";

import styles from "./icon_transition.module.scss";

interface IconTransitionProps {
  defaultIcon: ReactNode;
  activeIcon: ReactNode;
  isActive: boolean;
  className?: string;
}

export const IconTransition: FC<IconTransitionProps> = ({
  defaultIcon,
  activeIcon,
  isActive,
  className,
}) => {
  return (
    <span className={cn(styles.container, className)}>
      <span
        className={cn(styles.icon, isActive ? styles.hidden : styles.visible)}
      >
        {defaultIcon}
      </span>
      <span
        className={cn(
          styles.icon,
          styles.activeIcon,
          isActive ? styles.visible : styles.hidden,
        )}
      >
        {activeIcon}
      </span>
    </span>
  );
};
