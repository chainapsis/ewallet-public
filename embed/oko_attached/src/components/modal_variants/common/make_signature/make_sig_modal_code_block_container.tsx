import cn from "classnames";
import type { FC, ReactNode } from "react";

import styles from "./make_sig_modal_code_block_container.module.scss";

export interface MakeSignatureRawCodeBlockContainerProps {
  children: ReactNode;
  className?: string;
}

export const MakeSignatureRawCodeBlockContainer: FC<
  MakeSignatureRawCodeBlockContainerProps
> = ({ children, className }) => {
  return (
    <div className={cn(styles.codeBlockContainer, className)}>{children}</div>
  );
};
