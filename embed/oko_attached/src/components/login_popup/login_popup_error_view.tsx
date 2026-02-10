import type { FC } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { WarningIcon } from "@oko-wallet/oko-common-ui/icons/warning_icon";

import styles from "./login_popup_error_view.module.scss";
import type { AppError } from "@oko-wallet-attached/errors";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

export const LoginPopupErrorView: FC<LoginPopupErrorViewProps> = ({
  error,
}) => {
  const { closeModal, clearError } = useMemoryState();

  const { errorCode } = parseError(error);

  const handleClose = () => {
    closeModal(error);
    clearError();
  };

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <div className={styles.iconWrapper}>
          <WarningIcon size={42} />
        </div>
        <Typography
          tagType="h1"
          className={styles.title}
          color="primary"
          size="lg"
        >
          Request failed
        </Typography>
        <div className={styles.messageBox}>
          <div className={styles.textRow}>
            <Typography
              size="sm"
              weight="semibold"
              className={styles.messageText}
            >
              Error Code: {errorCode}
            </Typography>
          </div>
          <div className={styles.textRow}>
            <Typography
              size="sm"
              weight="semibold"
              className={styles.messageText}
            >
              {(error.error as any)?.message || "An unknown error occurred."}
            </Typography>
          </div>
        </div>
        <Typography
          tagType="a"
          href="https://okowallet.userjot.com/board/report-bugs"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.supportLink}
          size="xs"
          weight="medium"
        >
          Get Support
        </Typography>
      </div>
      <div className={styles.bottomSection}>
        <Button variant="secondary" size="lg" onClick={handleClose} fullWidth>
          Close
        </Button>
      </div>
    </div>
  );
};

interface LoginPopupErrorViewProps {
  error: AppError;
}

function parseError(error: AppError) {
  const detail = error.error;
  const errorCode = detail?.type ?? "unknown_error";

  return { errorCode };
}
