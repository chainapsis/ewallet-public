import cn from "classnames";
import type { FC, ReactNode } from "react";

import styles from "./make_sig_modal_code_block_container.module.scss";

export interface MakeSignatureRawCodeBlockContainerProps {
  children: ReactNode;
  className?: string;
  variant?: "top-level" | "embedded";
}

export const MakeSignatureRawCodeBlockContainer: FC<
  MakeSignatureRawCodeBlockContainerProps
> = ({ children, className, variant = "top-level" }) => {
  return (
    <div
      className={cn(
        styles.codeBlockContainer,
        variant === "embedded" ? styles.embedded : styles.topLevel,
        className,
      )}
    >
      {children}
    </div>
  );
};
