"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Card } from "@oko-wallet/oko-common-ui/card";
import { OkoLogoIcon } from "@oko-wallet/oko-common-ui/icons/oko_logo_icon";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useEffect, useState } from "react";

import styles from "./service_shutdown_modal.module.scss";

const SESSION_KEY = "oko_ct_shutdown_noticed";

export const ServiceShutdownModal: FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setIsOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  }, []);

  const onClose = () => setIsOpen(false);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalBackground} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ct-shutdown-title"
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

            <div className={styles.title} id="ct-shutdown-title">
              <Typography size="lg" weight="semibold" color="secondary">
                Service Shutdown Notice
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
                Please remove Oko SDK and API integrations from your dapp before
                the shutdown date.
              </p>
            </div>

            <Spacing height={8} />

            <div className={styles.body}>
              <Typography size="sm" weight="medium" color="primary">
                Also, please inform your users to export their private keys and
                migrate to another wallet. After June 1, Oko API and SDK will no
                longer be available.
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
          </div>
        </Card>
      </div>
    </div>
  );
};
