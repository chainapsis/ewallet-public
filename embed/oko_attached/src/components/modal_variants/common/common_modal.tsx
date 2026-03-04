import { type FC, type PropsWithChildren, useRef, useCallback } from "react";
import cn from "classnames";

import styles from "./common_modal.module.scss";

export interface CommonModalProps {
  padding?: string;
  className?: string;
}

export const CommonModal: FC<PropsWithChildren<CommonModalProps>> = ({
  children,
  padding,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTarget = container.querySelector<HTMLElement>(
      "[data-scroll-container]",
    );
    if (!scrollTarget) return;
    if (scrollTarget.contains(e.target as Node)) return;
    if (scrollTarget.scrollHeight <= scrollTarget.clientHeight) return;

    scrollTarget.scrollTop += e.deltaY;
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(styles.modalContainer, className)}
      style={{ padding }}
      onWheel={handleWheel}
    >
      {children}
    </div>
  );
};
