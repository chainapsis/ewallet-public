import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { IconTransition } from "@oko-wallet/oko-common-ui/icon_transition";
import { CheckCircleOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/check_circle_outlined";
import { CopyOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/copy_outlined";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useRef, useState } from "react";

import styles from "./api_key_cell.module.scss";

type APIKeyCellProps = {
  apiKeys: { api_key: string; is_active: boolean }[];
};

export const APIKeyCell: FC<APIKeyCellProps> = ({ apiKeys }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
    } catch {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setCopiedKey(apiKey);
    timerRef.current = setTimeout(() => {
      setCopiedKey(null);
      timerRef.current = null;
    }, 2000);
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

          <button
            type="button"
            onClick={() => handleCopy(apiKey.api_key)}
            className={styles.buttonIcon}
          >
            <IconTransition
              isActive={copiedKey === apiKey.api_key}
              defaultIcon={<CopyOutlinedIcon color="var(--fg-tertiary)" />}
              activeIcon={
                <CheckCircleOutlinedIcon color="var(--fg-tertiary)" />
              }
            />
          </button>
        </li>
      ))}
    </ul>
  );
};
