import cn from "classnames";
import type { FC } from "react";

import styles from "./code_block.module.scss";

export type CodeBlockProps = {
  code: string;
  className?: string;
};

export const CodeBlock: FC<CodeBlockProps> = ({ code, className }) => {
  return (
    <div className={cn(styles.codeBlock, "common-list-scroll", className)}>
      <pre>{code}</pre>
    </div>
  );
};
