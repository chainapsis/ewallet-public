"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Card } from "@oko-wallet/oko-common-ui/card";
import { OkoLogoIcon } from "@oko-wallet/oko-common-ui/icons/oko_logo_icon";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { useRouter } from "next/navigation";
import { type FC, useEffect, useState } from "react";

import styles from "./key_export_prompt_modal.module.scss";
import { paths } from "@oko-wallet-user-dashboard/paths";

const SESSION_KEY = "oko_key_export_prompted";

export const KeyExportPromptModal: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setIsOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  }, []);

  const onClose = () => setIsOpen(false);

  const onExportPrivateKey = () => {
    onClose();
    window.dispatchEvent(new CustomEvent("oko:reset-export-step"));
    router.push(paths.export_private_key);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalBackground} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-export-prompt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className={styles.modalCard} variant="elevated" padding="none">
          <div className={styles.header}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close modal"
            >
              <XCloseIcon color="var(--fg-quaternary)" size={20} />
            </button>
          </div>

          <div className={styles.content}>
            <div className={styles.logoWrapper}>
              <OkoLogoIcon width={72} height={28} />
            </div>

            <Spacing height={12} />

            <div className={styles.title} id="key-export-prompt-title">
              <Typography size="lg" weight="semibold" color="secondary">
                Please Export Your Private Key
              </Typography>
            </div>

            <Spacing height={28} />

            <div className={styles.body}>
              <Typography size="sm" weight="medium" color="primary">
                Oko is shutting down its service on June 1, 2026.
              </Typography>
            </div>

            <Spacing height={8} />

            <div className={styles.warningBox}>
              <p className={styles.warningText}>
                You must export your keys and migrate your Oko wallet to another
                wallet.
              </p>
            </div>

            <Spacing height={8} />

            <div className={styles.body}>
              <Typography size="sm" weight="medium" color="primary">
                After this date, your Private Key will no longer be accessible.
              </Typography>
            </div>

            <Spacing height={8} />
          </div>

          <div className={styles.footer}>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={onClose}
              className={styles.footerButton}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={onExportPrivateKey}
              className={styles.footerButton}
            >
              Export Private Key
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
