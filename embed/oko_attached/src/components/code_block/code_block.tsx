import cn from "classnames";
import type { FC } from "react";

import styles from "./code_block.module.scss";

export type CodeBlockProps = {
  code: string;
  className?: string;
  contentClassName?: string;
};

export const CodeBlock: FC<CodeBlockProps> = ({
  code,
  className,
  contentClassName,
}) => {
  return (
    <div className={cn(styles.codeBlock, "common-list-scroll", className)}>
      <pre className={contentClassName}>{code}</pre>
    </div>
  );
};
