"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { ErrorIcon } from "@oko-wallet/oko-common-ui/icons/error_icon";
import { TrashIcon } from "@oko-wallet/oko-common-ui/icons/trash";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Input } from "@oko-wallet/oko-common-ui/input";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { type FC, useRef, useState } from "react";

import styles from "./delete_api_key_modal.module.scss";

export type DeleteAPIKeyModalProps = {
  apiKey: string;
  onDelete: () => void;
  onClose: () => void;
  isDeleting: boolean;
};

export const DeleteAPIKeyModal: FC<DeleteAPIKeyModalProps> = ({
  apiKey,
  onDelete,
  onClose,
  isDeleting,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [touched, setTouched] = useState(false);
  const mouseDownOnOverlay = useRef(false);

  const isConfirmed = confirmText === "Delete";
  const showError = touched && confirmText.length > 0 && !isConfirmed;

  const handleDelete = () => {
    if (!isConfirmed) {
      setTouched(true);
      return;
    }
    onDelete();
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        mouseDownOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownOnOverlay.current) {
          onClose();
        }
        mouseDownOnOverlay.current = false;
      }}
    >
      <div className={styles.modal}>
        <div className={styles.closeRow}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <XCloseIcon color="var(--fg-quaternary)" size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.titleRow}>
            <TrashIcon color="var(--text-error-primary)" size={24} />
            <Typography size="lg" weight="semibold" color="error-primary">
              Delete API key
            </Typography>
          </div>

          <Spacing height={20} />

          <Typography size="md" weight="medium" color="primary">
            This API key will be permanently deleted.
          </Typography>

          <Spacing height={24} />

          <Typography size="xs" weight="semibold" color="secondary">
            API Key
          </Typography>

          <Spacing height={8} />

          <div className={cn(styles.apiKeyBox, styles.apiKeyBoxActive)}>
            <Typography
              size="md"
              weight="medium"
              color="error-primary"
              tagType="p"
            >
              {apiKey}
            </Typography>
            <Typography size="sm" weight="regular" color="error-primary">
              Any requests using this key will stop working immediately.
            </Typography>
          </div>

          <Spacing height={28} />

          <Input
            label='Type "Delete" to confirm'
            name="confirm-delete"
            placeholder="Delete"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
            }}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setTouched(true);
              }
            }}
            error={showError ? "Confirmation text doesn't match." : undefined}
            SideComponent={
              showError ? (
                <ErrorIcon
                  color="var(--fg-error-primary)"
                  size={16}
                  className={styles.errorIcon}
                />
              ) : undefined
            }
            fullWidth
          />

          <Spacing height={24} />
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            isLoading={isDeleting}
            className={isConfirmed ? styles.deleteButton : undefined}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
