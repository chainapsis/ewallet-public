"use client";

import { Card } from "@oko-wallet/oko-common-ui/card";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, type ReactNode, useState } from "react";

import styles from "./info_modal.module.scss";

interface InfoModalProps {
  title: string;
  content: string;
  renderTrigger: (props: { onOpen: () => void }) => ReactNode;
}

export const InfoModal: FC<InfoModalProps> = ({
  title,
  content,
  renderTrigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  return (
    <>
      {renderTrigger({ onOpen })}

      {isOpen && (
        <div className={styles.overlay} onClick={onClose}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <Card className={styles.modalCard} variant="elevated" padding="lg">
              <div className={styles.modalContent}>
                <div className={styles.header}>
                  <Typography size="sm" weight="semibold" color="secondary">
                    {title}
                  </Typography>
                  <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close modal"
                  >
                    <XCloseIcon color="var(--fg-quaternary)" size={20} />
                  </button>
                </div>

                <Spacing height={16} />

                <Typography size="md" weight="medium" color="secondary">
                  {content}
                </Typography>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};
