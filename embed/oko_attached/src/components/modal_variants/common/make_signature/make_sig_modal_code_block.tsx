import cn from "classnames";
import type { FC } from "react";

import styles from "./make_sig_modal_code_block.module.scss";
import { CodeBlock } from "@oko-wallet-attached/components/code_block/code_block";

interface MakeSignatureRawCodeBlockProps {
  code: string;
  className?: string;
  variant?: "top-level" | "embedded";
}

export const MakeSignatureRawCodeBlock: FC<MakeSignatureRawCodeBlockProps> = ({
  code,
  className,
  variant = "top-level",
}) => {
  const contentClassName =
    variant === "embedded" ? styles.contentEmbedded : styles.contentTopLevel;

  return (
    <CodeBlock
      className={cn(
        styles.codeBlock,
        variant === "embedded" ? styles.embedded : styles.topLevel,
        className,
      )}
      contentClassName={cn(styles.content, contentClassName)}
      code={code}
    />
  );
};
