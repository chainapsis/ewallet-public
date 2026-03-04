import { type FC, type PropsWithChildren, useRef, useEffect } from "react";
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const scrollTarget = container.querySelector<HTMLElement>(
        "[data-scroll-container]",
      );
      if (!scrollTarget) return;
      if (scrollTarget.contains(e.target as Node)) return;
      if (scrollTarget.scrollHeight <= scrollTarget.clientHeight) return;

      e.preventDefault();
      scrollTarget.scrollTop += e.deltaY;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(styles.modalContainer, className)}
      style={{ padding }}
    >
      {children}
    </div>
  );
};
