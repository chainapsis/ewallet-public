import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import cn from "classnames";
import type { FC } from "react";

import styles from "./auth_progress_widget.module.scss";
import { Spinner } from "@oko-wallet-user-dashboard/components/spinner/spinner";

type AuthProgressWidgetProps = {
  method: AuthType;
  status?: "loading" | "failed";
  onRetry?: () => void;
};

export const AuthProgressWidget: FC<AuthProgressWidgetProps> = ({
  method,
  status = "loading",
  onRetry,
}) => {
  const isFailed = status === "failed";

  return (
    <div className={cn(styles.signingInWrapper, { [styles.failed]: isFailed })}>
      <div className={styles.signingInCircle}>
        {method === "auth0" && <MailboxIcon size={36} />}
        {method === "google" && <GoogleIcon width={48} height={48} />}
        {method === "telegram" && <TelegramIcon size={48} />}
        {method === "x" && <XIcon size={48} />}
        {method === "discord" && <DiscordIcon size={48} />}
        <Spinner
          size={62}
          className={styles.spinnerOverlay}
          status={isFailed ? "failed" : "loading"}
        />
      </div>
      <Spacing height={9} />
      {isFailed ? (
        <>
          <Typography size="md" weight="medium" color="primary">
            Login failed
          </Typography>
          {onRetry ? (
            <div className={styles.retryButton} onClick={onRetry}>
              <Typography size="sm" weight="semibold" color="brand-secondary">
                Retry
              </Typography>
            </div>
          ) : null}
        </>
      ) : (
        <Typography
          size="md"
          weight="medium"
          color="primary"
          className={styles.signingInText}
        >
          Signing in
        </Typography>
      )}
    </div>
  );
};
