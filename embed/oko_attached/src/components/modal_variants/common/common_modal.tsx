import cn from "classnames";
import type { FC, PropsWithChildren } from "react";

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
  return (
    <div className={cn(styles.modalContainer, className)} style={{ padding }}>
      {children}
    </div>
  );
};
