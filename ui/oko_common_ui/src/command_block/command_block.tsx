import { type FC, useState } from "react";

import styles from "./command_block.module.scss";
import { CopyOutlinedIcon } from "@oko-wallet-common-ui/icons/copy_outlined";
import { Tooltip } from "@oko-wallet-common-ui/tooltip/tooltip";
import { Typography } from "@oko-wallet-common-ui/typography/typography";

export type CommandBlockProps = {
  command: string;
};

export const CommandBlock: FC<CommandBlockProps> = ({ command }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        {copied ? (
          <Typography
            tagType="span"
            size="xs"
            color="success-primary"
            className={styles.copiedText}
          >
            Copied ✓
          </Typography>
        ) : (
          <Tooltip title="Copy" placement="top" hideFloatingArrow>
            <button
              type="button"
              className={styles.copyButton}
              onClick={handleCopy}
            >
              <CopyOutlinedIcon
                className={styles.copyIcon}
                color="var(--fg-quaternary)"
              />
            </button>
          </Tooltip>
        )}
      </div>
      <div className={styles.code}>
        <pre>
          <code>{command}</code>
        </pre>
      </div>
    </div>
  );
};
