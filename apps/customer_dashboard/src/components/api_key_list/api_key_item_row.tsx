"use client";

import { AnchoredMenu } from "@oko-wallet/oko-common-ui/anchored_menu";
import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { CopyOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/copy_outlined";
import { EyeIcon } from "@oko-wallet/oko-common-ui/icons/eye";
import { EyeOffIcon } from "@oko-wallet/oko-common-ui/icons/eye_off";
import { ThreeDotsVerticalIcon } from "@oko-wallet/oko-common-ui/icons/three_dots_vertical";
import { TrashIcon } from "@oko-wallet/oko-common-ui/icons/trash";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { TableCell, TableRow } from "@oko-wallet/oko-common-ui/table";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useState } from "react";

import styles from "./api_key_list.module.scss";

export type APIKeyItemRowProps = {
  apiKey: string;
  keyId: string;
  status: "active" | "inactive";
  createdDate: string;
  onDelete: (keyId: string) => void;
};

export const APIKeyItemRow: FC<APIKeyItemRowProps> = ({
  apiKey,
  keyId,
  status,
  createdDate,
  onDelete,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const apiKeyHalfLength = Math.floor(apiKey.length / 2);

  return (
    <TableRow key={apiKey}>
      <TableCell className={styles.apiKeyCell}>
        <Badge
          label={status.charAt(0).toUpperCase() + status.slice(1)}
          color={status === "active" ? "success" : "error"}
          size="sm"
          type="pill"
        />
        <Spacing width={8} />

        <Typography
          tagType="span"
          size="md"
          weight="medium"
          color="secondary"
          className={styles.apiKey}
        >
          {isVisible
            ? apiKey
            : apiKey.slice(0, apiKeyHalfLength) + "•".repeat(apiKeyHalfLength)}
        </Typography>

        <Spacing width={8} />

        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className={styles.buttonIcon}
        >
          {isVisible ? (
            <EyeOffIcon color="var(--fg-tertiary)" size={20} />
          ) : (
            <EyeIcon color="var(--fg-tertiary)" size={20} />
          )}
        </button>

        <Spacing width={4} />

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
            onClick={handleCopy}
            className={styles.buttonIcon}
          >
            <CopyOutlinedIcon color="var(--fg-tertiary)" size={20} />
          </button>
        )}
      </TableCell>

      <TableCell className={styles.dateCell}>
        {formatDate(createdDate)}
      </TableCell>

      <TableCell className={styles.actionCell}>
        <AnchoredMenu
          placement="bottom-end"
          className={styles.deleteMenu}
          TriggerComponent={
            <button type="button" className={styles.buttonIcon}>
              <ThreeDotsVerticalIcon
                color="var(--fg-secondary, #414651)"
                size={24}
                className={styles.horizontalDots}
              />
            </button>
          }
          menuItems={[
            {
              id: "delete",
              label: "Delete",
              onClick: () => onDelete(keyId),
              className: styles.deleteMenuItem,
              labelColor: "error-primary",
              icon: <TrashIcon color="var(--fg-error-secondary, #f04438)" size={24} />,
            },
          ]}
        />
      </TableCell>
    </TableRow>
  );
};

function formatDate(dateString: string): string {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
