import cn from "classnames";
import type { FC, PropsWithChildren } from "react";

import styles from "./widget_components.module.scss";

export const Widget: FC<
  PropsWithChildren<{
    gradientBorder?: boolean;
  }>
> = ({ children, gradientBorder = false }) => {
  return (
    <div className={cn(styles.widget, gradientBorder && styles.gradientBorder)}>
      {children}
    </div>
  );
};
