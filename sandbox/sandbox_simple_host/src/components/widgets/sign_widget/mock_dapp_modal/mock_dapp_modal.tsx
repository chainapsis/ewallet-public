import type { FC } from "react";
import { createPortal } from "react-dom";

import { SignWidgetContent, type SignWidgetProps } from "../sign_widget";
import styles from "./mock_dapp_modal.module.scss";

export interface MockDappModalProps {
  isOpen: boolean;
  onClose: () => void;
  signWidgetProps: SignWidgetProps;
}

export const MockDappModal: FC<MockDappModalProps> = ({
  isOpen,
  onClose,
  signWidgetProps,
}) => {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <div
        className={styles.modalOverlay}
        onClick={onClose}
        aria-label="Close modal overlay"
      />
      <div
        className={styles.modalContainer}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <p>Sign via dapp modal</p>
          <button
            className={styles.closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            X
          </button>
        </div>
        <SignWidgetContent {...signWidgetProps} hideDappModalButton />
      </div>
    </>,
    document.body,
  );
};
