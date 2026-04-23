"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Card } from "@oko-wallet/oko-common-ui/card";
import { AlertTriangleIcon } from "@oko-wallet/oko-common-ui/icons/alert_triangle_icon";
import { OkoLogoIcon } from "@oko-wallet/oko-common-ui/icons/oko_logo_icon";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useState } from "react";

import styles from "./service_shutdown_modal.module.scss";

const SHUTDOWN_DATE_DISPLAY = "MM/DD";

export const ServiceShutdownModal: FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        className={styles.pill}
        onClick={onOpen}
        aria-label="Open service shutdown notice"
      >
        <AlertTriangleIcon
          size={20}
          color="#dc6803"
          className={styles.pillIcon}
        />
        <Typography size="sm" weight="semibold" color="primary">
          Service Shutdown Notice: Export Your Wallet
        </Typography>
      </button>

      {isOpen && (
        <div className={styles.modalBackground} onClick={onClose}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-shutdown-title"
            onClick={(e) => e.stopPropagation()}
          >
            <Card
              className={styles.modalCard}
              variant="elevated"
              padding="none"
            >
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

                <div className={styles.title} id="service-shutdown-title">
                  <Typography size="lg" weight="semibold" color="secondary">
                    Please Export Your Private Key
                  </Typography>
                </div>

                <Spacing height={28} />

                <div className={styles.body}>
                  <Typography size="sm" weight="medium" color="primary">
                    Oko is shutting down its service.
                  </Typography>
                </div>

                <Spacing height={8} />

                <div className={styles.warningBox}>
                  <p className={styles.warningText}>
                    You must export your keys and migrate your Oko wallet to
                    another wallet.
                  </p>
                </div>

                <Spacing height={8} />

                <div className={styles.body}>
                  <Typography size="sm" weight="medium" color="primary">
                    After {SHUTDOWN_DATE_DISPLAY}, your Private Key will no
                    longer be accessible.
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
      )}
    </>
  );
};
