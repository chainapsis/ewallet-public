import { type FC, type PropsWithChildren } from "react";
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
  return (
    <div className={cn(styles.modalContainer, className)} style={{ padding }}>
      {children}
    </div>
  );
};
