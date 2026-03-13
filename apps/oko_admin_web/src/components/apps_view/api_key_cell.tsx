import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { CopyOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/copy_outlined";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useState } from "react";

import styles from "./api_key_cell.module.scss";

type APIKeyCellProps = {
  apiKeys: { api_key: string; is_active: boolean }[];
};

export const APIKeyCell: FC<APIKeyCellProps> = ({ apiKeys }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <ul className={styles.apiKeyCell}>
      {apiKeys.map((apiKey) => (
        <li key={apiKey.api_key} className={styles.apiKeyItem}>
          <Badge
            label={apiKey.is_active ? "Active " : "Inactive "}
            color={apiKey.is_active ? "success" : "error"}
            size="sm"
          />

          <Typography
            tagType="span"
            size="md"
            weight="medium"
            color="secondary"
            className={styles.apiKey}
          >
            {apiKey.api_key.slice(0, 10) + "..." + apiKey.api_key.slice(-10)}
          </Typography>

          {isCopied ? (
            <Typography
              tagType="span"
              size="xs"
              color="success-primary"
              className={styles.copiedText}
            >
              Copied ✓
            </Typography>
          ) : (
            <button
              type="button"
              onClick={() => handleCopy(apiKey.api_key)}
              className={styles.buttonIcon}
            >
              <CopyOutlinedIcon color="var(--fg-tertiary)" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};
